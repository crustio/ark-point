import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RESULT] points schema
const points = new Schema({
  accountId: {type: String, index: true, unique:true},
  // latest calculate slot
  reportSlot: Number,
  totalCapacity: Number,
  dropRate: Number,
  reportRate: Number,
  points: Number,
  totalPoints: Number,
  pointInCycle: [
    {
      index: Number,
      point: Number,
    },
  ],
});
export = mongoose.model('Points', points, 'Points');
