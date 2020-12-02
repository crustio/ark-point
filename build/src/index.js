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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chain_1 = __importDefault(require("./chain"));
// Point counting started block number
const startBN = Number(process.argv[2]) || 1284900;
const chain = new chain_1.default(process.argv[3] || 'ws://106.14.136.219:9944');
function calculator() {
    return __awaiter(this, void 0, void 0, function* () {
        const head = yield chain.header();
        const currentBN = 1284904; //head.number.toNumber();
        const miners = new Array();
        for (let i = startBN; i < currentBN; i++) {
            const block = yield chain.block(i);
            console.log(JSON.parse(JSON.stringify(block)));
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield calculator();
    });
}
// Call main
main();
