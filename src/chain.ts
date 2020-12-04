/* eslint-disable node/no-extraneous-import */
import {ApiPromise, WsProvider} from '@polkadot/api';
import {Header, BlockHash} from '@polkadot/types/interfaces';

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

/**
 * Chain Api Accessor
 */
export default class Chain {
  private readonly api: ApiPromise;

  constructor(addr: string) {
    this.api = this.newChainApi(addr);
  }

  /**
   * Register a pubsub event, dealing with new block
   * @param handler handling with new block
   * @returns unsubscribe signal
   * @throws ApiPromise error
   */
  async subscribeNewHeads(handler: (b: Header) => void) {
    await this.api.isReady;
    return await this.api.rpc.chain.subscribeNewHeads((head: Header) =>
      handler(head)
    );
  }

  /**
   * Get full block info
   * @param bh block hash
   */
  async block(bh: BlockHash) {
    await this.api.isReady;
    return await this.api.rpc.chain.getBlock(bh);
  }

  /**
   * Get block hash
   * @param bn block number
   */
  async blockHash(bn: number) {
    await this.api.isReady;
    return await this.api.rpc.chain.getBlockHash(bn);
  }

  /**
   * Get block events
   * @param bh block hash
   */
  async events(bh: BlockHash) {
    await this.api.isReady;
    return await this.api.query.system.events.at(bh);
  }

  /**
   * Get stash account id by controller id
   * @param c controller account address
   */
  async stash(c: string) {
    await this.api.isReady;
    const ledger = (await this.api.query.staking.ledger(c)).unwrap();
    return ledger.stash;
  }

  private newChainApi(addr: string): ApiPromise {
    return new ApiPromise({
      provider: new WsProvider(addr),
      types,
    });
  }
}
