import NodeStatusService from './nodeStatusService';
import {EventDetails} from './eventService';
import {logger} from '../log';
import {parseObj} from '../util';
import * as bd from '../db';

export default class SlotService {
  private readonly nss: NodeStatusService;
  private fetchedSlot: number;

  constructor(nss: NodeStatusService) {
    this.nss = nss;
    this.fetchedSlot = 0;
  }

  async slotHandler(event: EventDetails) {
    const eventMethod = `${event.section}.${event.method}`;
    const currentSlot = await this.nss.chainService.currentSlot();

    if ('swork.RegisterSuccess' === eventMethod) {
      logger.debug('swork.RegisterSuccess', JSON.stringify(event.event.data));
      const registerController = parseObj(event.event.data[0]);
      const registerPubKey = parseObj(event.event.data[1]);
      await this.nss.addAccountIdBondAndPubKeyReport(
        registerController,
        registerPubKey,
        currentSlot
      );
    }

    if ('swork.ABUpgradeSuccess' === eventMethod) {
      const upgradeInfo = parseObj(event.event.data);
      await bd.updateEndedSlot(this.fetchedSlot, upgradeInfo[1]);
      await bd.updateEffectiveSlot(this.fetchedSlot, upgradeInfo[2]);
    }

    if ('swork.ChillSuccess' === eventMethod) {
      const chillInfo = parseObj(event.event.data);
      await bd.updateEndedSlot(this.fetchedSlot, chillInfo[1]);
    }

    if (this.fetchedSlot < currentSlot) {
      logger.info(`New slot to update reported status ${currentSlot}`);
      this.fetchedSlot = currentSlot;
      await this.nss.reportStatusUpdateMany(currentSlot);
    }
  }
}
