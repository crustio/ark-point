import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RAW] event schema
const events = new Schema({
  blockNumber: Number,
  index: String,
  phase: {},
  event: {},
  section: String,
  method: String,
  meta: {},
  message: String,
  details: String,
  // Current event report slot
  reportSlot: Number,
});

export = mongoose.model('Events', events, 'Events');
