import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RAW] work report reported schema
const reportedStatus = new Schema({
  pubKey: {type: String, index: true, unique: true},
  // Newest reported slot. NO USE, just show the latest status
  reportedSlot: Number,
  // First reported slot
  effectiveSlot: Number,
  // Last reported slot
  endedSlot: Number,
  // Reported work report count
  reportedCount: Number,
});

export = mongoose.model('ReportedStatus', reportedStatus, 'ReportedStatus');
