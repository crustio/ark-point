import mongoose from '../db/mongoose';

const Schema = mongoose.Schema;

// [RAW] validator(aka. block authors) online rate
const validatorOnlineStatus = new Schema({
  accountId: {type: String, index: true, unique: true},
  offlineEras: Number,
  effectiveEra: Number, // First be candidate/validator era
  latestEra: Number, // Can/Val still be there
  latestOfflineEra: Number, // For duplicate `SomeoneOffline`
  beValidatorEras: Number, // The guy be a validator
});

export = mongoose.model(
  'ValidatorOnlineStatus',
  validatorOnlineStatus,
  'ValidatorOnlineStatus'
);
