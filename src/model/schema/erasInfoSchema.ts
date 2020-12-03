import mongoose from '../../db/mongooseConf';
import {stringify} from "querystring";

const Schema = mongoose.Schema;

// [RAW] miner points schema
const erasInfoSchema = new Schema({
    // eraIndex
    eraIndex: {type: Number, index: true, unique:true},
    // sessionIndex
    sessionIndex: {type: Number, index: true, unique:true},
    // reportSlot
    reportSlot: {type: Number, index: true, unique:true},
    // validators
    validator: [{
        stash: String,
        controller: String
    }],
    // candidates
    candidates: [{
        stash: String,
        controller: String
    }]
});

export = mongoose.model('ErasInfoSchema', erasInfoSchema, 'erasInfo');
