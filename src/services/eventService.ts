import {parseObj} from '../util';
import * as db from '../db';

export interface EventDetails {
  blockNumber: number;
  index: any;
  reportSlot: number;
  phase: any;
  event: any;
  section: any;
  method: any;
  meta: any;
  message: any;
  details: any;
}

export default class EventService {

  async eventHandler(event: EventDetails) {
    db.saveEvent(parseObj(event));
  }

}
