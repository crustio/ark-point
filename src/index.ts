import { GenericEventData } from '@polkadot/types';
import { EventRecord, Extrinsic } from '@polkadot/types/interfaces';
import * as _ from 'lodash';
import Chain from './chain';
import {Miner, ReportStatus, ValidatorStatus} from './model';

const startBN: number = 1224645;
const startEra: number = 4203;
// Point counting started block number
const pointBN: number = Number(process.argv[2]) || 1314640
const chain: Chain = new Chain(process.argv[3] || 'ws://106.14.136.219:9944');
const UNIT: number = 1_000_000_000_000;

async function calculator() {
    // Get current block number
    const head = await chain.header();
    const currentBN = 1314641; //head.number.toNumber();
    
    // Final result
    const miners: Map<string, Miner> = new Map<string, Miner>();
    
    // Work report status, [AccountId, sWorkerPubKey] <-> ReportStatus
    // Change by `WorkReportSuccess` and `ChillSuccess` events 
    const reportStatus: Map<[string, string], ReportStatus> = new Map<[string, string], ReportStatus>();
    
    // Validator status, AccountId <-> ValidatorStatus
    // Changed by `SomeOffline` event and `EraReward` events
    const validatorStatus: Map<string, ValidatorStatus> = new Map<string, ValidatorStatus>();

    // Current era and era's validators status
    const erasValidators: Set<string> = new Set<string>();
    const erasOffliners: Set<string> = new Set<string>(); 
    let currEra: number = startEra; // initial current era

    // 0. Outter loop: blocks
    for (let bn: number = startBN; bn < currentBN; bn ++) {
        console.log(`Parse block ${bn}, ${currEra}`);

        // 1. Get block and events
        const bh = await chain.blockHash(bn);
        const block = await chain.block(bh);
        const extrinsics: Extrinsic[] = block.block.extrinsics;
        const ers: EventRecord[] = await chain.events(bh);
        const blockAuthor = await chain.blockAuthor(bh) as string;

        // 2. Add into eras validators
        erasValidators.add(blockAuthor);

        // 3. Inner loop: events
        for (const er of ers) {
            const event = er.event;
            const method = `${event.section}.${event.method}`;
            
            // 2.1. New work report
            if (bn >= pointBN && method === 'swork.WorksReportSuccess' && er.phase.isApplyExtrinsic) {
                // a. Get reportWorks extrinsics
                const exIdx = er.phase.asApplyExtrinsic.toNumber();
                const ex = extrinsics[exIdx];
                
                // b. Get report slot
                const exData = parseObj(ex.method).args;
                const slot = exData.slot;
                const capacity = exData.reported_srd_size;

                // c. Get reporter account and public key
                const reporter = await parseReporter(event.data);

                // d. Upsert reportStatus
                const oldStatus: ReportStatus = reportStatus.has(reporter) ? 
                reportStatus.get(reporter) as ReportStatus 
                : 
                {
                    capacity, 
                    count: 1,
                    slot, // Latest reported slot
                    chillSlot: 0,
                    jointSlot: slot,
                };
                    
                // e. Update `count`, plus filter duplicate event
                if (oldStatus.slot < slot) {
                    oldStatus.capacity = capacity;
                    oldStatus.count ++;
                    oldStatus.slot = slot;
                }
               
                // f. Update reportStatus
                reportStatus.set(reporter, oldStatus);
            } 
            
            // 2.2. sWorker chilled
            if (bn >= pointBN && method === 'swork.ChillSuccess') {
                // a. Get chillded slot
                const chillSlot = calculateSlot(bn);
                const reporter = await parseReporter(event.data);

                if (reportStatus.has(reporter)) {
                    const oldStatus = reportStatus.get(reporter) as ReportStatus;
                    
                    // b. Update chillSlot 
                    oldStatus.chillSlot = chillSlot;
                    reportStatus.set(reporter, oldStatus);
                }
            }

            // 2.3. New validator/candidate
            if (method === 'staking.ValidateSuccess') {
                // a. Get stash account
                const controller = parseObj(event.data[0]);
                const stash = await getStash(controller);

                // b. If new, insert into validator status
                if (!validatorStatus.has(stash)) {
                    validatorStatus.set(stash, {
                        beValCount: 0,
                        beCanEra: currEra + 1,
                        offlineCount: 0, 
                    });
                }
            }

            // 2.4. Someone offline
            if (bn >= pointBN && method === 'imOnline.SomeOffline') {
                // a. Get offline accounts
                const offences = parseObj(event.data[0]);
                const offliners = offences.map((o: any) => o[0]);

                // b. Loop all offline stashes
                for (const offliner of offliners) {
                    // c. Add to erasOffliners
                    erasOffliners.add(offliner);  
                }
            }

            // 2.5. New era, calculate points
            if (method === 'staking.EraReward') {
                const era: number = parseObj(event.data[0]);
                
                if (bn >= pointBN) {
                    const slot: number = calculateSlot(bn);
                    // a. Loop this era's validators
                    for (const v of erasValidators) {
                        if (validatorStatus.has(v)) {
                            const oldStatus = validatorStatus.get(v) as ValidatorStatus;
                            oldStatus.beValCount ++;

                            validatorStatus.set(v, oldStatus);
                        } else {
                            validatorStatus.set(v, {
                                beValCount: 1,
                                beCanEra: currEra,
                                offlineCount: 0
                            });
                        }
                    }

                    // b. Loop this era's offliner
                    for (const v of erasOffliners) {
                        if (validatorStatus.has(v)) {
                            const oldStatus = validatorStatus.get(v) as ValidatorStatus;
                            oldStatus.offlineCount ++;

                            validatorStatus.set(v, oldStatus);
                        } else {
                            validatorStatus.set(v, {
                                beValCount: 1,
                                beCanEra: currEra,
                                offlineCount: 1
                            });
                        }
                    }

                    // ✨ c. Calculate points
                    for (const ventry of validatorStatus.entries()) {
                        const vStash: string = ventry[0];
                        const vs: ValidatorStatus = ventry[1];

                        // 1. Sum up capacity & calculate report works ratio
                        let capacity: number = 0;
                        let totalReportRatio: number = 0;
                        let totalPkCount: number = 0;
                        for (const rentry of reportStatus.entries()) {
                            const [rStash, pk] = rentry[0];
                            const rs: ReportStatus = rentry[1];
                            if (vStash === rStash) {
                                capacity += getPercent(rs.capacity, UNIT);
                                const shouldReportedSlot = rs.chillSlot === 0 ? slot - rs.jointSlot : rs.chillSlot - rs.jointSlot;
                                totalReportRatio += getPercent(rs.count, shouldReportedSlot)
                                totalPkCount ++;
                            }
                        }
                        const reportRatio = getPercent(totalReportRatio, totalPkCount);

                        // 2. Calculate beValidatorRate
                        const beValRatio = getPercent(vs.beValCount, era - vs.beCanEra);

                        // 3. Calculate offlineRate
                        const offlineRatio = getPercent(vs.offlineCount, vs.beValCount);

                        // 4. Calculate point
                        const points = capacity * (1 + beValRatio * getValidatorMultiplier(offlineRatio)) * reportRatio;

                        // 5. Write result
                        let newMiner: Miner = {
                            capacity: capacity,
                            offlineRate: offlineRatio,
                            beValRate: beValRatio,
                            workReportRate: reportRatio,
                            totalPoints: points 
                        };

                        if (miners.has(vStash)) {
                            const oldMiner = miners.get(vStash) as Miner;
                            newMiner.totalPoints = oldMiner.totalPoints + points;
                        }
                        
                        miners.set(vStash, newMiner);
                    }
                }

                // d. Update era status
                currEra = era;
                erasValidators.clear();
                erasOffliners.clear();
            }
            
            // 2.5. Otherwise, ignore it
        }

        console.log(reportStatus);
        console.log(validatorStatus);
        console.log(miners);
    }
}

/* Calculator Tool Functions */
function parseObj(obj: any) {
    return JSON.parse(JSON.stringify(obj));
};

async function getStash(c: string) {
    return (await chain.stash(c)).toString();
}

async function parseReporter(eventData: GenericEventData): Promise<[string, string]> {
    const reporterController = parseObj(eventData[0]);
    // TODO: if the bonding relationship changed, `controller <-> stash`, `reportedStatus` should change
    const reporterStash = await getStash(reporterController);
    const reporterPubKey = parseObj(eventData[1]);
    return [reporterStash, reporterPubKey];
}

function calculateSlot(bn: number): number {
    return (bn / 300) * 300;
} 

function getValidatorMultiplier(or: number) {
    if (0 == or) {
      return 0.1;
    } else if (0 < or && or <= 0.01) {
      return 0.0;
    } else {
      return -0.2;
    }
  }
  
function getReportMultiplier(rr: number) {
    if (0.99 < rr) {
      return 1;
    } else if (0.98 < rr && 0.99 >= rr) {
      return 0.9;
    } else if (0.97 < rr && 0.98 >= rr) {
      return 0.8;
    } else if (0.95 < rr && 0.97 >= rr) {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  function getPercent(molecular: number, denominator: number) {
    molecular *= 1.0;
    if (denominator == 0) {
      return 0;
    } else {
      return Math.round((molecular / denominator) * 100000000) / 100000000;
    }
  }

async function main() {
    await calculator();
}

// Call main
main();