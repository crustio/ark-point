/* eslint-disable node/no-extraneous-import */
import {
  Header,
  EventRecord,
  Extrinsic,
  Event,
} from '@polkadot/types/interfaces';
import {ReportStatus, ValidatorStatus} from './model';
import {parseObj} from './util';
import Chain from './chain';
import {logger} from './log';

export default class Calculator {
  private readonly chain: Chain;
  // Current block number
  private currBn: number;
  // Work report status, [AccountId, sWorkerPubKey] <-> ReportStatus
  // Change by `WorkReportSuccess` and `ChillSuccess` events
  private reportStatus: Map<[string, string], ReportStatus>;
  // Validator status, AccountId <-> ValidatorStatus
  // Changed by `SomeOffline` event and `EraReward` events
  private validatorStatus: Map<string, ValidatorStatus>;

  constructor(addr: string) {
    this.chain = new Chain(addr);
    // TODO: load from db.Blocks
    this.currBn = 0;
    this.reportStatus = new Map<[string, string], ReportStatus>();
    this.validatorStatus = new Map<string, ValidatorStatus>();
  }

  /**
   * Entry function, listen to the new block head
   */
  start() {
    this.chain.subscribeNewHeads((...args) => this.handleNewHead(...args));
  }

  /**
   * Handle new block header, get full block information,
   * save raw data into database
   * @param h block header
   */
  private async handleNewHead(h: Header) {
    const bn = h.number.toNumber();
    logger.info(`⛓ [chain]: Receive new block ${bn}`);

    if (this.currBn === bn) {
      logger.warn(`  ↪ ⛓ [chain]: Already handled block ${bn}`);
      return;
    }

    // 1. Get full block {header, extrinsics, events}
    const bh = h.hash;
    const block = await this.chain.block(bh);
    const exs: Extrinsic[] = block.block.extrinsics;
    const ers: EventRecord[] = await this.chain.events(bh);

    // 2. Handle state change
    this.handleNewState(ers, exs);

    // 3. TODO: Save raw block data into database
    // db.Blocks.save(block, ers);

    // 4. Update flags
    this.currBn = bn;
  }

  private async handleNewState(ers: Array<EventRecord>, exs: Array<Extrinsic>) {
    for (const er of ers) {
      const event = er.event;

      if (!event) {
        logger.error('  ↪ 💥 [chain]: Cannot handle the event');
        continue;
      }

      const method = `${event.section}.${event.method}`;

      // 2.1. New work report
      if (method === 'swork.WorksReportSuccess' && er.phase.isApplyExtrinsic) {
        // a. Get reportWorks extrinsics
        const exIdx = er.phase.asApplyExtrinsic.toNumber();
        const ex = exs[exIdx];
        // b. Handle report works
        this.handleReportWorks(er.event, ex);
      }

      // // 2.2. sWorker chilled
      // if (bn >= pointBN && method === 'swork.ChillSuccess') {
      //   // a. Get chillded slot
      //   const chillSlot = calculateSlot(bn);
      //   const reporter = await parseReporter(event.data);

      //   if (reportStatus.has(reporter)) {
      //     const oldStatus = reportStatus.get(reporter) as ReportStatus;

      //     // b. Update chillSlot
      //     oldStatus.chillSlot = chillSlot;
      //     reportStatus.set(reporter, oldStatus);
      //   }
      // }

      // // 2.3. New validator/candidate
      // if (method === 'staking.ValidateSuccess') {
      //   // a. Get stash account
      //   const controller = parseObj(event.data[0]);
      //   const stash = await getStash(controller);

      //   // b. If new, insert into validator status
      //   if (!validatorStatus.has(stash)) {
      //     validatorStatus.set(stash, {
      //       beValCount: 0,
      //       beCanEra: currEra + 1,
      //       offlineCount: 0,
      //     });
      //   }
      // }

      // // 2.4. Someone offline
      // if (bn >= pointBN && method === 'imOnline.SomeOffline') {
      //   // a. Get offline accounts
      //   const offences = parseObj(event.data[0]);
      //   const offliners = offences.map((o: any) => o[0]);

      //   // b. Loop all offline stashes
      //   for (const offliner of offliners) {
      //     // c. Add to erasOffliners
      //     erasOffliners.add(offliner);
      //   }
      // }

      // // 2.5. New era, calculate points
      // if (method === 'staking.EraReward') {
      //   const era: number = parseObj(event.data[0]);

      //   if (bn >= pointBN) {
      //     const slot: number = calculateSlot(bn);
      //     // a. Loop this era's validators
      //     for (const v of erasValidators) {
      //       if (validatorStatus.has(v)) {
      //         const oldStatus = validatorStatus.get(v) as ValidatorStatus;
      //         oldStatus.beValCount++;

      //         validatorStatus.set(v, oldStatus);
      //       } else {
      //         validatorStatus.set(v, {
      //           beValCount: 1,
      //           beCanEra: currEra,
      //           offlineCount: 0,
      //         });
      //       }
      //     }

      //     // b. Loop this era's offliner
      //     for (const v of erasOffliners) {
      //       if (validatorStatus.has(v)) {
      //         const oldStatus = validatorStatus.get(v) as ValidatorStatus;
      //         oldStatus.offlineCount++;

      //         validatorStatus.set(v, oldStatus);
      //       } else {
      //         validatorStatus.set(v, {
      //           beValCount: 1,
      //           beCanEra: currEra,
      //           offlineCount: 1,
      //         });
      //       }
      //     }

      //     // ✨ c. Calculate points
      //     for (const ventry of validatorStatus.entries()) {
      //       const vStash: string = ventry[0];
      //       const vs: ValidatorStatus = ventry[1];

      //       // 1. Sum up capacity & calculate report works ratio
      //       let capacity = 0;
      //       let totalReportRatio = 0;
      //       let totalPkCount = 0;
      //       for (const rentry of reportStatus.entries()) {
      //         const [rStash, pk] = rentry[0];
      //         const rs: ReportStatus = rentry[1];
      //         if (vStash === rStash) {
      //           capacity +=
      //             rs.chillSlot === 0 ? getPercent(rs.capacity, UNIT) : 0;
      //           const shouldReportedSlot =
      //             rs.chillSlot === 0
      //               ? slot - rs.jointSlot
      //               : rs.chillSlot - rs.jointSlot;
      //           totalReportRatio += getPercent(rs.count, shouldReportedSlot);
      //           totalPkCount++;
      //         }
      //       }
      //       const reportRatio = getPercent(totalReportRatio, totalPkCount);

      //       // 2. Calculate beValidatorRate
      //       const beValRatio = getPercent(vs.beValCount, era - vs.beCanEra);

      //       // 3. Calculate offlineRate
      //       const offlineRatio = getPercent(vs.offlineCount, vs.beValCount);

      //       // 4. Calculate point
      //       const points =
      //         capacity *
      //         (1 + beValRatio * getValidatorMultiplier(offlineRatio)) *
      //         getReportMultiplier(reportRatio);

      //       // 5. Write result
      //       const newMiner: Miner = {
      //         capacity: capacity,
      //         offlineRate: offlineRatio,
      //         beValRate: beValRatio,
      //         workReportRate: reportRatio,
      //         totalPoints: points,
      //       };

      //       if (miners.has(vStash)) {
      //         const oldMiner = miners.get(vStash) as Miner;
      //         newMiner.totalPoints = oldMiner.totalPoints + points;
      //       }

      //       miners.set(vStash, newMiner);
      //     }
      //   }

      //   // d. Update era status
      //   currEra = era;
      //   erasValidators.clear();
      //   erasOffliners.clear();
      // }

      // 2.5. Otherwise, ignore it
    }
  }

  private async handleReportWorks(ev: Event, ex: Extrinsic) {
    // 1. Get report slot
    const exData = parseObj(ex.method).args;
    const slot = exData.slot;
    const capacity = exData.reported_srd_size;

    // 2. Get reporter controller account and public key
    const c: string = parseObj(ev.data[0]);
    const pk: string = parseObj(ev.data[1]);

    // 3. Upsert reportStatus
    this.upsertReportStatus(c, pk, slot, capacity);
  }

  private async upsertReportStatus(
    c: string,
    pk: string,
    slot: number,
    capacity: number
  ) {
    logger.info(
      `  ↪ 📨 [works] New work report { ${c}, ${pk}, ${slot}, ${capacity} }`
    );

    // 1. Read old status from db
    const reporter: [string, string] = [c, pk];
    const oldStatus: ReportStatus = this.reportStatus.has(reporter)
      ? (this.reportStatus.get(reporter) as ReportStatus)
      : {
          capacity,
          count: 1,
          slot, // Latest reported slot
          chillSlot: 0,
          jointSlot: slot,
        };

    // 2. Update `count`, plus filter duplicate event
    if (oldStatus.slot < slot) {
      oldStatus.capacity = capacity;
      oldStatus.count++;
      oldStatus.slot = slot;
    }

    // 3. Update reportStatus
    this.reportStatus.set(reporter, oldStatus);
  }
}
