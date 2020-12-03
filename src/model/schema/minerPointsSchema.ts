import mongoose from '../../db/mongooseConf';

const Schema = mongoose.Schema;

// [RAW] miner points schema
const minerPointsSchema = new Schema({
    // miner stash id
    stash: {type: String, index: true, unique:true},
    // eraIndex
    eraIndex: {type: Number, index: true, unique:true},
    // total capacity
    capacity: Number,
    // beValidator offline rate
    offlineRate: Number,
    // beValidator rate since join net to current era
    beValRate: Number,
    // total pubKey workReportRate since join test net to current era
    workReportRate: Number,
    // totalPoints since join
    point: Number,
});

export = mongoose.model('MinerPointsSchema', minerPointsSchema, 'minerPoints');
