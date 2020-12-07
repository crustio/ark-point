/* eslint-disable node/no-extraneous-import */
import {ApiPromise, WsProvider} from '@polkadot/api';
import {Header} from '@polkadot/types/interfaces';
import {EventRecord, SignedBlock} from '@polkadot/types/interfaces';
import {logger} from '../log';
import {bytesToTeraBytes, parseObj} from '../util';
import BN from 'bn.js';

const types = {
  Address: 'AccountId',
  AddressInfo: 'Vec<u8>',
  ETHAddress: 'Vec<u8>',
  FileAlias: 'Vec<u8>',
  Guarantee: {
    targets: 'Vec<IndividualExposure<AccountId, Balance>>',
    total: 'Compact<Balance>',
    submitted_in: 'EraIndex',
    suppressed: 'bool',
  },
  IASSig: 'Vec<u8>',
  Identity: {
    pub_key: 'Vec<u8>',
    code: 'Vec<u8>',
  },
  ISVBody: 'Vec<u8>',
  LookupSource: 'AccountId',
  MerchantInfo: {
    address: 'Vec<u8>',
    storage_price: 'Balance',
    file_map: 'Vec<(Vec<u8>, Vec<Hash>)>',
  },
  MerchantPunishment: {
    success: 'EraIndex',
    failed: 'EraIndex',
    value: 'Balance',
  },
  MerkleRoot: 'Vec<u8>',
  OrderStatus: {
    _enum: ['Success', 'Failed', 'Pending'],
  },
  PaymentLedger: {
    total: 'Balance',
    paid: 'Balance',
    unreserved: 'Balance',
  },
  Pledge: {
    total: 'Balance',
    used: 'Balance',
  },
  ReportSlot: 'u64',
  Releases: {
    _enum: ['V1_0_0', 'V2_0_0'],
  },
  SorderInfo: {
    file_identifier: 'MerkleRoot',
    file_size: 'u64',
    created_on: 'BlockNumber',
    merchant: 'AccountId',
    client: 'AccountId',
    amount: 'Balance',
    duration: 'BlockNumber',
  },
  SorderStatus: {
    completed_on: 'BlockNumber',
    expired_on: 'BlockNumber',
    status: 'OrderStatus',
    claimed_at: 'BlockNumber',
  },
  SorderPunishment: {
    success: 'BlockNumber',
    failed: 'BlockNumber',
    updated_at: 'BlockNumber',
  },
  Status: {
    _enum: ['Free', 'Reserved'],
  },
  StorageOrder: {
    file_identifier: 'Vec<u8>',
    file_size: 'u64',
    created_on: 'BlockNumber',
    completed_on: 'BlockNumber',
    expired_on: 'BlockNumber',
    provider: 'AccountId',
    client: 'AccountId',
    amount: 'Balance',
    order_status: 'OrderStatus',
  },
  SworkerCert: 'Vec<u8>',
  SworkerCode: 'Vec<u8>',
  SworkerPubKey: 'Vec<u8>',
  SworkerSignature: 'Vec<u8>',
  WorkReport: {
    report_slot: 'u64',
    used: 'u64',
    free: 'u64',
    files: 'BTreeMap<MerkleRoot, u64>',
    reported_files_size: 'u64',
    reported_srd_root: 'MerkleRoot',
    reported_files_root: 'MerkleRoot',
  },
};

export interface BlockWithEvent {
  block: SignedBlock;
  events: EventRecord[];
}

let api: ApiPromise = newApiPromise();

function newApiPromise(): ApiPromise {
  return new ApiPromise({
    provider: new WsProvider(process.argv[2] || 'ws://106.14.136.219:9944'),
    types,
  });
}

export const getApi = (): ApiPromise => {
  return api;
};

export const initApi = () => {
  if (api && api.disconnect) {
    logger.info('⚠️  Disconnecting from old api...');
    api
      .disconnect()
      .then(() => {})
      .catch(() => {});
  }
  api = newApiPromise();
  api.isReady.then(api => {
    logger.info(
      `⚡️ [global] Current chain info: ${api.runtimeChain}, ${api.runtimeVersion}`
    );
  });
};

export default class ChainService {
  readonly api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  /**
   * Register a pubsub event, dealing with new block
   * @param handler handling with new block
   * @returns unsubscribe signal
   * @throws ApiPromise error
   */
  async subscribeNewHeads(handler: (b: Header) => void) {
    await this.withApiReady();
    return await this.api.rpc.chain.subscribeFinalizedHeads((head: Header) =>
      handler(head)
    );
  }

  /**
   * Trying to get block with events
   * @param bn block number
   * @returns block with events
   */
  async blockWithEvent(bn: number): Promise<BlockWithEvent> {
    await this.withApiReady();
    const bh = await this.api.rpc.chain.getBlockHash(bn);
    const events = await this.api.query.system.events.at(bh);
    const block = await this.api.rpc.chain.getBlock(bh);
    return {
      block: block,
      events: events,
    };
  }

  async idBonds(accountId: string) {
    await this.withApiReady();
    return parseObj(await this.api.query.swork.idBonds(accountId));
  }

  async currentEra() {
    await this.withApiReady();
    return parseObj(await this.api.query.staking.activeEra()).index;
  }

  async validatorAndCandidates() {
    await this.withApiReady();
    const overview = parseObj(await this.api.derive.staking.overview());
    const waiting = parseObj(await this.api.derive.staking.waitingInfo());
    return [...waiting.waiting, ...overview.nextElected];
  }

  async totalCapacity() {
    await this.withApiReady();
    const used = (await this.api.query.swork.used()).toString();
    const free = (await this.api.query.swork.free()).toString();
    return bytesToTeraBytes(new BN(used).add(new BN(free)));
  }

  async stakeLimit(accountId: string) {
    await this.withApiReady();
    return await this.api.query.staking.stakeLimit(accountId);
  }

  async currentSlot() {
    await this.withApiReady();
    return parseObj(await this.api.query.swork.currentReportSlot());
  }

  async validators() {
    await this.withApiReady();
    return parseObj(await this.api.query.session.validators());
  }

  async bonded(stashId: string) {
    await this.withApiReady();
    return await this.api.query.staking.bonded(stashId);
  }

  async ledger(controllerId: string) {
    await this.withApiReady();
    return await this.api.query.staking.ledger(controllerId);
  }

  private async withApiReady(): Promise<void> {
    await this.api.isReadyOrError;
  }
}
