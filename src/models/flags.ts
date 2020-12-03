import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RAW] current era
const flags = new Schema({
  // Set in db manually
  startSlot: Number,

  // Update from `NewHeads`
  latestEra: Number,

  // Trigger to write to reward schema
  countedEras: Number, // 240 eras per cycle
  erasCycle: Number, // 1 cycle means 240 eras
});

export = mongoose.model('Flags', flags, 'Flags');
