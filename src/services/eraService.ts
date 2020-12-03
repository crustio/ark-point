import NodeStatusService from './nodeStatusService';
import {EventDetails} from './eventService';
import {parseObj} from '../util';
import {logger} from '../log';
import {flags} from '../db';

export default class EraService {
  private readonly nss: NodeStatusService;
  private fetchedEra: number;

  constructor(nss: NodeStatusService) {
    this.nss = nss;
    this.fetchedEra = 0;
  }

  async eraHandler(event: EventDetails) {
    const eventMethod = `${event.section}.${event.method}`;
    const currentEra = await this.nss.chainService.currentEra();
    if (this.fetchedEra === 0) {
      const flag = await flags();
      this.fetchedEra = flag.latestEra;
    }

    if ('imOnline.SomeOffline' === eventMethod) {
      const offences = parseObj(event.event.data[0]);
      const offlineList = offences.map((e: any) => e[0]);
      for (const offline of offlineList) {
        await this.nss.updateOfflineStatus(offline, currentEra);
      }
    }

    if (this.fetchedEra < currentEra) {
      logger.info(
        `New era to upsert node list and update points ${currentEra}`
      );
      this.fetchedEra = currentEra;
      logger.info(`Go to update miner points at era: ${currentEra}`);
      const currentSlot = await this.nss.chainService.currentSlot();
      await this.nss.upsertValidatorsOrCandidates(currentEra, currentSlot);
      await this.nss.updateAllMinersPoints(currentEra, currentSlot);
    }
  }
}
