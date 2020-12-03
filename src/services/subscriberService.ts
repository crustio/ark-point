import {Header} from '@polkadot/types/interfaces';
import NodeStatusService from '../services/nodeStatusService';
import EventService, {EventDetails} from './eventService';
import SlotService from './slotService';
import EraService from './eraService';
import ChainService, {BlockWithEvent} from './chainService';
import {ApiPromise} from '@polkadot/api';
import {parseObj} from "../util";
import {logger} from "../log";
import {EventRecord, DispatchError, Extrinsic} from '@polkadot/types/interfaces';
import {ITuple} from '@polkadot/types/types';

export default class SubscriberService {
  readonly chainService: ChainService;
  private readonly nodeStatusService: NodeStatusService;
  private readonly eventService: EventService;
  private readonly slotService: SlotService;
  private readonly eraService: EraService;
  private currentBN: number;

  constructor(api: ApiPromise) {
    this.chainService = new ChainService(api);
    this.nodeStatusService = new NodeStatusService(this.chainService);
    this.slotService = new SlotService(this.nodeStatusService);
    this.eraService = new EraService(
      this.nodeStatusService
    );
    this.eventService = new EventService();
    this.currentBN = 0;
  }

  async subscribeNewBlock() {
    const blockWithEvent = async (b: Header) => {
      if (this.currentBN < b.number.toNumber()) {
        this.currentBN = b.number.toNumber();
        const blockWithEvents = await this.chainService.blockWithEvent(this.currentBN);
        const eventDetails = await this.parseBlock(blockWithEvents);
        for (const eventDetail of eventDetails) {
          await this.eventService.eventHandler(eventDetail);
          await this.eraService.eraHandler(eventDetail);
          await this.slotService.slotHandler(eventDetail);
        }
      }
    };
    const unsubscribe = await this.chainService.subscribeNewHeads(
      await blockWithEvent
    );
    return unsubscribe;
  }

  async parseBlock(blockWithEvent: BlockWithEvent): Promise<EventDetails[]> {
    const txs: Extrinsic[] = blockWithEvent?.block?.block?.extrinsics;
    const reportedSlot = parseObj(
        await this.chainService.api.query.swork.currentReportSlot()
    );
    const blockNumber = parseObj(blockWithEvent.block.block.header.number);
    const resEvents: EventRecord[] = blockWithEvent.events;
    const result = [];
    // Get the block time first
    for (const resEvent of resEvents) {
      // 1. Parse and save raw event
      const eventDetail = this.parseEvent(resEvent, blockNumber, reportedSlot);
      result.push(eventDetail);
    }
    for (const ex of txs) {
      const method = JSON.stringify(ex.method);
      const usedMethod = ex.method.methodName;
      const section = ex.method.sectionName;
      let callIndex = `${section}.${usedMethod}`;
      if ('swork.reportWorks' === callIndex) {
        const data = JSON.parse(method).args;
        if (data) {
          const reportedSlot = data.slot;
          for (const eventDetail of result) {
            const eventData = parseObj(eventDetail.event.data);
            if (eventData[1] == data.curr_pk) {
              logger.info(`replace correct slot ${reportedSlot}`)
              eventDetail.reportSlot = reportedSlot
            }
          }
        }
      }
    }
    return result;
  }

  private parseEvent(
      param: EventRecord,
      blockNumber: number,
      reportedSlot: number
  ) {
    let message = param.event.meta.name.toString();
    let details = param?.event?.meta?.documentation?.join('');
    let index = blockNumber + '-';
    if (param.event.method === 'ExtrinsicFailed') {
      const [dispatchError] = (param.event.data as unknown) as ITuple<
          [DispatchError]
          >;
      if (dispatchError.isModule) {
        try {
          const mod = dispatchError.asModule;
          const error = this.chainService.api.registry.findMetaError(
              new Uint8Array([mod.index.toNumber(), mod.error.toNumber()])
          );
          message = `${error.section}.${error.name}`;
          details = error.documentation.join('');
        } catch (error) {
          message = error.message;
        }
      }
    }
    try {
      index = blockNumber + '-' + `${Number(param.phase.asApplyExtrinsic) + 1}`;
    } catch (e) {
      // pass it
      logger.error(`getEventDetail error ${e.message}`);
    }
    const result = {
      blockNumber,
      index,
      reportSlot: reportedSlot,
      phase: param.phase,
      event: param.event,
      section: param.event.section,
      method: param.event.method,
      meta: param.event.meta,
      message,
      details,
    };
    return result;
  }
}
