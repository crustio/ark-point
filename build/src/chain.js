"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@polkadot/api");
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
class Chain {
    constructor(addr) {
        this.api = this.newChainApi(addr);
    }
    block(bn) {
        return __awaiter(this, void 0, void 0, function* () {
            const readyApi = yield this.api.isReady;
            const bh = yield readyApi.rpc.chain.getBlockHash(bn);
            return yield readyApi.rpc.chain.getBlock(bh);
        });
    }
    header() {
        return __awaiter(this, void 0, void 0, function* () {
            const readyApi = yield this.api.isReady;
            return yield readyApi.rpc.chain.getHeader();
        });
    }
    newChainApi(addr) {
        return new api_1.ApiPromise({
            provider: new api_1.WsProvider(addr),
            types,
        });
    }
}
exports.default = Chain;