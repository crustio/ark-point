import mongoose from '../../db/mongooseConf';

const Schema = mongoose.Schema;

// [RAW] erasInfo schema
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

export = mongoose.model('ErasInfoSchema', erasInfoSchema, 'ErasInfo');
