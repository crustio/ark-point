import BN from 'bn.js';
import {ValidatorOnlineStatus, Points, IdBonds} from '../models';
import {bytesToTeraBytes, parseObj, preSlot} from '../util';
import * as db from '../db';
import ChainService from './chainService';

const MAX_RECORDED_ERAS = 240;
const REWARD_PER_CYCLE = 75000;
const LIMIT_UINT = 10;

export default class NodeStatusService {
  readonly chainService: ChainService;

  constructor(chainService: ChainService) {
    this.chainService = chainService;
  }

  /**
   * Each era change pulls the validators and candidates in the chain
   * @param currentEra
   */
  async upsertValidatorsOrCandidates(currentEra: number, currentSlot: number) {
    const minerList = await this.chainService.validatorAndCandidates();
    const validators = await this.chainService.validators();
    for (const miner of minerList) {
      // Then make a comparison in the database.
      // If it exists, compare whether the current era is greater than the latest era saved in the database.
      // If it is greater than, add one to the beValidatorEras of the miner
      const minerInDb = await db.validatorOnlineStatusFindOne(miner);
      if (minerInDb) {
        if (validators.indexOf(minerInDb.accountId) !== -1) {
          if (currentEra > minerInDb.latestEra) {
            await db.ValidatorOnlineStatusUpdateOne(
              minerInDb._id,
              minerInDb.beValidatorEras + 1,
              currentEra
            );
          }
        }
      } else {
        // If it does not exist in the database, first judge whether the miner is a validator.
        // If it is a validator, execute newValidatorOnlineStatus;
        // if not, execute newCandidateOnlineStatus
        if (validators.indexOf(miner) !== -1) {
          await db.newValidatorOnlineStatus(miner, currentEra, currentEra);
        } else {
          await db.newCandidateOnlineStatus(miner, currentEra);
        }
      }
      // Finally, synchronize the pubKey information of miner
      await this.maybeSaveNewIdBonds(miner, currentSlot);
    }
  }

  /**
   * This method will be launched when imOnline.SomeOffline event is monitored
   * Update node offline status
   * @param accountId
   * @param currentEra
   */
  async updateOfflineStatus(accountId: string, currentEra: number) {
    // according to the incoming accountId
    // If currentEra is greater than, then update, otherwise pass it
    const onlineV = await db.validatorOnlineStatusFindOne(accountId);
    if (onlineV) {
      await db.offlineStatusEraPlus(
        onlineV._id,
        onlineV.offlineEras + 1,
        currentEra
      );
    }
  }

  /**
   * After listening to the swork.RegisterSuccess event,
   * Added records for AccountIdBond and PubKeyReportStatus
   * @param controllerId
   * @param pubKey
   */
  async addAccountIdBondAndPubKeyReport(
    controllerId: string,
    pubKey: string,
    currentSlot: number
  ) {
    const ledger = parseObj(await this.chainService.ledger(controllerId));
    if (ledger) {
      await db.saveIdBond(ledger.stash, pubKey);
      await db.savePubKeyReportStatus(pubKey, currentSlot);
    }
  }

  public reportStatusUpdateMany = async (currentSlot: number) => {
    const ps = preSlot(currentSlot);
    const pubKeyReports = await db.historyPubKeyReports(ps);
    const reportedPubKeys = pubKeyReports.map((pk: {_id: any}) => pk._id);
    await db.updateUnReportedPubKey(reportedPubKeys);
    for (const pubKeyReport of pubKeyReports) {
      const dbReportStatus = await db.reportedStatusFindOne(pubKeyReport._id);
      if (dbReportStatus) {
        if (
          dbReportStatus.reportedCount === 0 &&
          pubKeyReport.reportCount > 0
        ) {
          await db.updateStatusAndEffectiveSlot(
            dbReportStatus._id,
            pubKeyReport.reportCount,
            ps,
            ps
          );
        } else {
          await db.reportedStatusUpdate(
            dbReportStatus._id,
            pubKeyReport.reportCount,
            ps
          );
        }
      } else {
        await db.reportedStatusSave(
          pubKeyReport._id,
          currentSlot,
          pubKeyReport.reportCount
        );
      }
    }
  };

  private async calculatePoints(currentEra: number): Promise<Array<any>> {
    const result: Array<any> = [];

    // 0. Get all stashes
    const validators = await ValidatorOnlineStatus.find().exec();
    for (const validator of validators) {
      const stash = validator.accountId;

      // 1. Calculate `work_report_multipler`
      //    According to the pubKey query and calculation of the current slot upload workReport situation
      let totalReportRate = 0;
      let realPubKeyCount = 0;
      const accountPubKeys = await IdBonds.find({
        accountId: stash,
      }).exec();
      for (const accountPubKey of accountPubKeys) {
        const pubKeyWorkReport = await db.reportedStatusByPubKey(
          accountPubKey.pubKey
        );
        if (pubKeyWorkReport && pubKeyWorkReport.reportedCount > 0) {
          realPubKeyCount++;
          const totalReportedSlotsBN = !pubKeyWorkReport.endedSlot
            ? Math.max(
                pubKeyWorkReport.reportedSlot - pubKeyWorkReport.effectiveSlot,
                0
              )
            : Math.max(
                pubKeyWorkReport.endedSlot - pubKeyWorkReport.effectiveSlot,
                0
              );
          const totalReportCount = totalReportedSlotsBN / 300 + 1;
          totalReportRate += Math.min(this.getPercent(
              pubKeyWorkReport.reportedCount,
              totalReportCount
          ), 1) ;
        }
      }
      const reportRate = Math.min(
        1,
        this.getPercent(totalReportRate, realPubKeyCount)
      );
      const reportMultiplier = this.getReportMultiplier(reportRate);

      // 2. Calculate `storage_capacity`
      let stakeLimit: any;
      const controller = parseObj(await this.chainService.bonded(stash));
      if (controller) {
        stakeLimit = (await this.chainService.stakeLimit(stash)).toString();
      } else {
        stakeLimit = 0;
      }
      const totalCapacity = bytesToTeraBytes(
        new BN(stakeLimit).divn(LIMIT_UINT)
      );

      // 3. Calculate `validator_rate`
      const latestEra = currentEra;
      const validatorRate = this.getPercent(
        validator.beValidatorEras,
        latestEra - validator.effectiveEra + 1
      );

      // 4. Calculate `validator_multiplier`
      //    �The drop rate is the quotient of the number of dropped calls and the number of validator
      const dropRate = Math.min(
        1,
        this.getPercent(validator.offlineEras, validator.beValidatorEras * 3)
      );
      const validatorMultiplier = this.getValidatorMultiplier(dropRate);

      // 5. Calculate indicators
      const behaviorIndicators = 1 + validatorRate * validatorMultiplier;

      // 6. Calculate points
      const points = this.getNodeSlotPoints(
        totalCapacity,
        behaviorIndicators,
        reportMultiplier
      );

      // 7. Push stash points result
      result.push({
        accountId: stash,
        totalCapacity,
        dropRate,
        reportRate,
        points,
      });
    } // End of loop all stashes

    // 8. Return back
    return result;
  }

  /**
   * The score of each era trigger update node
   * And it may be counted in the reward table
   * @param currentEra
   * @param currentSlot
   */
  async updateAllMinersPoints(currentEra: number, currentSlot: number) {
    await this.updateAllMinerPoints(currentEra, preSlot(currentSlot));
    const flag = await db.flags();
    // Era for next statistics
    const nextCountedEras = flag.countedEras + 1;
    // If the next era to be counted is greater than the maximum number of era,
    // the total score of this era needs to be counted and written into the reward table
    if (MAX_RECORDED_ERAS < nextCountedEras) {
      let minersTotalPoints = 0;
      const minerPoints = await Points.find().exec();
      for (const minerPoint of minerPoints) {
        minersTotalPoints += minerPoint.totalPoints;
        // Write the total score of the minerPoint into the statistical array,
        // and set the total score to the current era score
        await this.saveUnCalPointsInCycle(minerPoint, flag.erasCycle);
        await db.pointsUpdateTotalPoints(
          minerPoint._id,
          minerPoint.points,
          flag.erasCycle,
          minerPoint.totalPoints
        );
      }
      // The score of the node is counted and written into the reward table
      await this.saveMinerCycleReward(
        flag.erasCycle,
        minerPoints,
        minersTotalPoints
      );
      // Clear the flag of statistics from the beginning
      await db.flagsClear(flag._id, flag.erasCycle + 1, currentEra);
    } else {
      // If the condition of statistical reward is not met,
      // only countedEra needs to be accumulated
      // And update the latest statistics of era
      await db.updateFlags(flag._id, nextCountedEras, currentEra);
    }
  }

  async saveUnCalPointsInCycle(minerPoints: any, currentCycle: number) {
    const recordedCycle: number[] = [];
    minerPoints.pointInCycle.forEach((e: {index: number}) =>
      recordedCycle.push(e.index)
    );
    if (recordedCycle.length < currentCycle - 1) {
      for (let i = 1; i < currentCycle; i++) {
        if (recordedCycle.indexOf(i) === -1) {
          await db.pointsUpdateTotalPoints(
            minerPoints._id,
            minerPoints.points,
            i,
            0
          );
        }
      }
    }
  }

  async saveMinerCycleReward(
    erasCycle: number,
    minerPoints: any,
    minersPoints: number
  ) {
    const rewardRecord = this.erasRewards(minerPoints, minersPoints);
    await db.rewardSave(erasCycle, rewardRecord);
  }

  private erasRewards(dbNodes: any[], nodesPoints: number) {
    const rewards = [];
    for (const dbNode of dbNodes) {
      const rewardPercentage = (dbNode.totalPoints * 1.0) / nodesPoints;
      rewards.push({
        accountId: dbNode.accountId,
        point: dbNode.totalPoints,
        totalPoints: nodesPoints,
        rewardPercentage,
        reward: REWARD_PER_CYCLE * rewardPercentage,
      });
    }
    return rewards;
  }

  private getValidatorMultiplier(dropRate: number) {
    if (0 === dropRate) {
      return 0.1;
    } else if (0 < dropRate && dropRate <= 0.01) {
      return 0.05;
    } else if (0.01 < dropRate && dropRate <= 0.02) {
      return 0.0;
    } else if (0.02 < dropRate && dropRate <= 0.03) {
      return -0.05;
    } else {
      return -0.1;
    }
  }

  private getReportMultiplier(reportSuccessRate: number) {
    if (0.99 < reportSuccessRate) {
      return 1;
    } else if (0.98 < reportSuccessRate && 0.99 >= reportSuccessRate) {
      return 0.9;
    } else if (0.97 < reportSuccessRate && 0.98 >= reportSuccessRate) {
      return 0.8;
    } else if (0.95 < reportSuccessRate && 0.97 >= reportSuccessRate) {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private getPercent(molecular: number, denominator: number) {
    if (denominator === 0) {
      return 0;
    } else {
      return (
        Math.round(((molecular * 1.0) / denominator) * 100000000) / 100000000
      );
    }
  }

  /**
   * Each era triggers,
   * Synchronizes the idBonds in the chain to the database
   * and adds a reportedStatus record
   * @param stashId
   * @private
   */
  private async maybeSaveNewIdBonds(stashId: string, currentSlot: number) {
    const controller = parseObj(await this.chainService.bonded(stashId));
    if (controller) {
      const idBonds = parseObj(await this.chainService.idBonds(controller));
      if (idBonds && Array.isArray(idBonds)) {
        for (const pubKey of idBonds) {
          await db.saveIdBond(stashId, pubKey);
          await db.savePubKeyReportStatus(pubKey, currentSlot);
        }
      }
    }
  }

  /**
   * After each reportSlot is updated,
   * the statistical data of the node in the previous slot is obtained and recorded in the statistical table
   * @param currentEra
   * @param currentSlot
   */
  private async updateAllMinerPoints(currentEra: number, preSlot: number) {
    const eraPointsMiners = await this.calculatePoints(currentEra);
    for (const eraPointsMiner of eraPointsMiners) {
      // @ts-ignore
      eraPointsMiner.era = currentEra;
      const dbMinerPoints = await Points.findOne({
        accountId: eraPointsMiner.accountId,
      }).exec();
      if (dbMinerPoints) {
        const tmpTotalPoints = dbMinerPoints.totalPoints;
        let totalPoints = tmpTotalPoints;
        // If the reportedSlot saved in the database is smaller than the current statistical slot,
        // the total score needs to be superimposed;
        // otherwise, only the score of the current statistical slot needs to be updated
        if (preSlot > dbMinerPoints.reportSlot) {
          totalPoints = tmpTotalPoints + eraPointsMiner.points;
        }
        // @ts-ignore
        eraPointsMiner.totalPoints = totalPoints;
        // @ts-ignore
        eraPointsMiner.reportSlot = preSlot;
        await db.updatePoints(dbMinerPoints._id, eraPointsMiner);
      } else {
        // If it does not exist, a new record of pubKey uploading workReport will be added
        const points = new Points(eraPointsMiner);
        points.totalPoints = eraPointsMiner.points;
        points.reportSlot = preSlot;
        points.save();
      }
    }
  }

  private getNodeSlotPoints(
    totalCapacity: number,
    behaviorIndicators: number,
    reportMultiplier: number
  ) {
    return totalCapacity * behaviorIndicators * reportMultiplier;
  }
}
