import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RAW] id bonds schema
const idBonds = new Schema({
  accountId: {type: String, index: true},
  pubKey: {type: String, unique: true},
});

export = mongoose.model('IdBonds', idBonds, 'IdBonds');
