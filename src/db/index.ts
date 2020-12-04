import {
  Events,
  Flags,
  IdBonds,
  Points,
  ReportedStatus,
  Reward,
  ValidatorOnlineStatus,
} from '../models';
import {logger} from '../log';
import {preSlot} from '../util';

export const saveEvent = (event: any) => {
  const saveEvent = new Events(event);
  saveEvent.save();
};

export const updateEndedSlot2Null = async () => {
  await ReportedStatus.updateMany(
    {
      endedSlot: {
        $ne: null,
      },
    },
    {
      $set: {
        endedSlot: null,
      },
    }
  ).exec();
};

export const flags = () => {
  return Flags.findOne().sort({startEra: -1}).skip(0).limit(1).exec();
};

export const updateFlags = async (
  _id: string,
  countedEras: number,
  latestEra: number
) => {
  Flags.updateOne(
    {
      _id,
    },
    {
      $set: {
        countedEras: countedEras,
        latestEra,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update start flag counted eras error, ${JSON.stringify(err)}`
        );
      }
      logger.info(
        `update start flag counted eras success, ${JSON.stringify(doc)}`
      );
    }
  );
};

export const updateEffectiveSlot = async (
  currentSlot: number,
  pubKey: string
) => {
  await ReportedStatus.updateOne(
    {pubKey},
    {
      $set: {
        effectiveSlot: currentSlot,
      },
    }
  ).exec();
};

// export const recordedErasClearing = async (id: string, latestEra: number) => {
//   Flags.updateOne(
//     {
//       _id: id,
//     },
//     {
//       $set: {
//         countedEras: 0,
//         latestEra,
//       },
//     },
//     (err: any, doc: any) => {
//       if (err) {
//         logger.error(
//           `clearing start flag counted era error, ${JSON.stringify(err)}`
//         );
//       }
//       logger.info(
//         `'clearing start flag counted era success, ${JSON.stringify(doc)}`
//       );
//     }
//   );
// };

// export const nodeTotalPointsClearing = () => {
//   Points.updateMany({}, {totalPoints: 0}, (err: string, res: any) => {
//     if (err) {
//       logger.info(`update node totalPoints Error: ${JSON.stringify(err)}`);
//     } else {
//       logger.info(`update node totalPoints Res: ${JSON.stringify(res)}`);
//     }
//   });
// };

/**
 * When the swork.ABUpgradeSuccess event is monitored,
 * The endedSlot is not null when all records are updated to the current reportSlot
 * @param currentSlot
 */

export const updateEndedSlot = async (currentSlot: number, pubKey: string) => {
  await ReportedStatus.updateOne(
    {endedSlot: null, pubKey},
    {
      $set: {
        endedSlot: currentSlot,
      },
    }
  ).exec();
};

export const queryNodeEraStatusOverview = async (
  currentPage: number,
  pageSize: number
) => {
  const skipNum = (currentPage - 1) * pageSize;
  return Points.find()
    .sort({totalPoints: -1})
    .skip(skipNum)
    .limit(pageSize)
    .exec();
};

export const totalNodeCount = async () => {
  return Points.find().count();
};

export const savePubKeyReportStatus = async (
  pubKey: string,
  currentSlot: number
) => {
  const pubKeyStatus = await reportedStatusFindOne(pubKey);
  if (!pubKeyStatus) {
    const pubKeyReport = new ReportedStatus({
      pubKey,
      effectiveSlot: currentSlot,
      endedSlot: null,
      reportedCount: 0,
      reportedSlot: currentSlot,
    });
    pubKeyReport.save();
  }
};

/**
 * After each slot is updated,
 * go to the database to query the workReport report number of the previous era node
 * @param currentReportSlot
 */
export const historyPubKeyReports = async (currentReportSlot: number) => {
  const startFlag = await flags();
  const startSlot = startFlag.startSlot ? startFlag.startSlot : 0;
  const results = await Events.aggregate([
    {
      $match: {
        reportSlot: {$lte: currentReportSlot, $gte: startSlot},
        section: 'swork',
        method: 'WorksReportSuccess',
      },
    },
    {
      $project: {
        _id: '$event.data',
        slot: '$reportSlot',
      },
    },
    {
      $project: {
        _id: {
          $slice: ['$_id', 1, 1],
        },
        slot: '$slot',
      },
    },
    {$unwind: '$_id'},
    {
      $group: {
        _id: {pubKey: '$_id', slot: '$slot'},
        reportCount: {
          $sum: 1,
        },
      },
    },
    {
      $group: {
        _id: '$_id.pubKey',
        reportCount: {
          $sum: 1,
        },
      },
    },
  ]).exec();
  return results;
};

export const latestReportSlot = async () => {
  const reportedStatus = await ReportedStatus.findOne()
    .sort({reportedSlot: 1})
    .limit(1)
    .exec();
  if (reportedStatus) {
    return reportedStatus.reportedSlot;
  } else {
    return 0;
  }
};

export const updatePoints = async (id: any, overview: any) => {
  Points.updateOne({_id: id}, overview, (err: any, doc: any) => {
    if (err) {
      logger.error(`update node overview error, ${JSON.stringify(err)}`);
    }
    logger.info(`update node overview success, ${JSON.stringify(doc)}`);
  });
};

export const reportedStatusFindOne = async (pubKey: string) => {
  return await ReportedStatus.findOne({
    pubKey,
  }).exec();
};

export const updateStatusAndEffectiveSlot = async (
  id: any,
  reportedCount: number,
  reportedSlot: number,
  effectiveSlot: number
) => {
  await ReportedStatus.updateOne(
    {_id: id},
    {
      $set: {
        reportedCount,
        reportedSlot,
        effectiveSlot,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update pubKey report status and effectiveSlot error, ${JSON.stringify(
            err
          )}`
        );
      }
      logger.info(
        `update pubKey report status and effectiveSlot  success, ${JSON.stringify(
          doc
        )}`
      );
    }
  );
};

export const saveIdBond = async (stashId: string, pubKey: string) => {
  const idBond = await idBondFindOne(stashId, pubKey);
  if (!idBond) {
    const accountIdBond = new IdBonds({
      accountId: stashId,
      pubKey,
    });
    accountIdBond.save();
  }
};

export const idBondFindOne = async (stashId: string, pubKey: string) => {
  return await IdBonds.findOne({
    accountId: stashId,
    pubKey,
  }).exec();
};

export const validatorOnlineStatusFindOne = async (accountId: string) => {
  return await ValidatorOnlineStatus.findOne({
    accountId,
  }).exec();
};

export const newCandidateOnlineStatus = async (
  accountId: string,
  effectiveEra: number
) => {
  const vOStatus = new ValidatorOnlineStatus({
    accountId,
    beValidatorEras: 0,
    offlineEras: 0,
    effectiveEra,
    latestEra: -1,
    latestOfflineEra: 0,
  });
  vOStatus.save();
};

export const ValidatorOnlineStatusUpdateOne = async (
  id: any,
  beValidatorEras: number,
  latestEra: number
) => {
  ValidatorOnlineStatus.updateOne(
    {_id: id},
    {
      $set: {
        beValidatorEras,
        latestEra,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update Validator Online Status error, ${JSON.stringify(err)}`
        );
      }
      logger.info(
        `update Validator Online Status success, ${JSON.stringify(doc)}`
      );
    }
  );
};

export const newValidatorOnlineStatus = async (
  accountId: string,
  effectiveEra: number,
  latestEra: number
) => {
  const vOStatus = new ValidatorOnlineStatus({
    accountId,
    beValidatorEras: 1,
    offlineEras: 0,
    effectiveEra,
    latestEra,
    latestOfflineEra: 0,
  });
  vOStatus.save();
};

export const offlineStatusUpdate = async (
  id: any,
  latestOfflineEra: number
) => {
  ValidatorOnlineStatus.updateOne(
    {_id: id},
    {
      $set: {
        offlineEras: 1,
        latestOfflineEra,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update validator offline status error, ${JSON.stringify(err)}`
        );
      }
      logger.info(
        `update validator offline status success, ${JSON.stringify(doc)}`
      );
    }
  );
};

export const offlineStatusEraPlus = async (
  id: any,
  offlineEras: number,
  latestOfflineEra: number
) => {
  ValidatorOnlineStatus.updateOne(
    {_id: id},
    {
      $set: {
        offlineEras,
        latestOfflineEra,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update Validator Offline Status error, ${JSON.stringify(err)}`
        );
      }
      logger.info(
        `update Validator Offline Status success, ${JSON.stringify(doc)}`
      );
    }
  );
};

export const reportedStatusUpdate = async (
  id: any,
  reportedCount: number,
  reportedSlot: number
) => {
  await ReportedStatus.updateOne(
    {_id: id},
    {
      $set: {
        reportedCount,
        reportedSlot,
      },
    },
    (err: any, doc: any) => {
      if (err) {
        logger.error(
          `update pubKey ${id} report status error, ${JSON.stringify(err)}`
        );
      }
      logger.info(
        `update pubKey ${id} report Status success, ${JSON.stringify(doc)}`
      );
    }
  );
};

export const reportedStatusSave = async (
  id: any,
  currentSlot: number,
  reportedCount: number
) => {
  const pre = preSlot(currentSlot);
  const newPubKeyReport = new ReportedStatus({
    pubKey: id,
    effectiveSlot: pre,
    endedSlot: null,
    reportedCount,
    reportedSlot: pre,
  });
  newPubKeyReport.save();
};

export const reportedStatusByPubKey = async (pubKey: string) => {
  return await ReportedStatus.findOne({
    pubKey,
  }).exec();
};

export const pointsUpdateTotalPoints = async (
  id: any,
  points: number,
  pointInCycleIndex: number,
  totalPoints: number
) => {
  await Points.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        totalPoints: points,
      },
      $push: {
        pointInCycle: {
          index: pointInCycleIndex,
          point: totalPoints,
        },
      },
    }
  ).exec();
};

export const rewardSave = async (cycleIndex: number, rewardRecord: any) => {
  const reward = new Reward({
    cycle: cycleIndex,
    rewardRecord,
  });
  reward.save();
};

export const flagsClear = async (
  id: any,
  erasCycle: number,
  currentEra: number
) => {
  await Flags.updateOne(
    {
      _id: id,
    },
    {
      erasCycle,
      countedEras: 0,
      latestEra: currentEra,
    }
  ).exec();
};

export const updateUnReportedPubKey = async (pubKeys: []) => {
  await ReportedStatus.updateMany(
    {pubKey: {$nin: pubKeys}},
    {reportedCount: 0},
    (err: string, res: any) => {
      if (err) {
        logger.info(
          `update reportedStatus UnReportedPubKey Error: ${JSON.stringify(err)}`
        );
      } else {
        logger.info(
          `update reportedStatus UnReportedPubKey success ${JSON.stringify(
            res
          )}`
        );
      }
    }
  );
};
