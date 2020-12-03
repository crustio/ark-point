import mongoose from '../../db/mongooseConf';

const Schema = mongoose.Schema;

// [RAW] miner points schema
const blocksSchema = new Schema({
    // blockNumber
    blockNumber: {type: Number, index: true, unique:true},
    // blockDetail
    blockDetail: {},
    events: []
});

export = mongoose.model('BlocksSchema', blocksSchema, 'Blocks');
