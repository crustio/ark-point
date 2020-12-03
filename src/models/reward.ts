import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RESULT] ark reward schema
const reward = new Schema({
  // Reward cycle number
  cycle: {type: Number, unique: true},
  rewardRecord: [
    {
      accountId: String,
      point: Number,
      totalPoints: Number,
      rewardPercentage: Number,
      reward: Number,
    },
  ],
});
export = mongoose.model('Reward', reward, 'Reward');
