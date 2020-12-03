import mongoose from '../../db/mongooseConf';

const Schema = mongoose.Schema;

// [RAW] miner beValidator status schema
const validatorStatusSchema = new Schema({
    // miner stash id
    stashId: {type: String, index: true, unique:true},
    // Be validator count
    beValCount: Number,
    // Be candidate/validator era index
    beCanEra: Number,
    // Offline count (session count)
    offlineCount: Number,
});

export = mongoose.model('ValidatorStatusSchema', validatorStatusSchema, 'ValidatorStatus');
