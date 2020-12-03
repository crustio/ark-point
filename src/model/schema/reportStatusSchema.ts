import mongoose from '../../db/mongooseConf';

const Schema = mongoose.Schema;

// [RAW] work report reported schema
const reportStatusSchema = new Schema({
    // miner controller id
    controller: {type: String, index: true, unique:true},
    // miner controller pubKey
    pubKey: {type: String, index: true, unique:true},
    // Total bytes
    capacity: Number,
    // Reported count
    count: Number,
    // Latest reported slot
    latestSlot: Number,
    // Chilled report slot
    chillSlot: Number,
    // First join report slot
    jointSlot: Number,
});

export = mongoose.model('ReportStatusSchema', reportStatusSchema, 'ReportStatus');
