import {ValidatorStatusSchema} from "../model/schema";
import {ValidatorStatus} from "../model/interface";

export const queryByStash = async (stashId: string) => {
    return ValidatorStatusSchema.findOne({
        stashId
    }).exec();
}

export const saveNewValidatorStatus = async (validatorStatus: ValidatorStatus) => {
    const validatorStatusSchema = new ValidatorStatusSchema(validatorStatus);
    const validatorStatusInDb = await queryByStash(validatorStatus.stashId);
    if (!validatorStatusInDb) {
        validatorStatusSchema.save();
    }
}

export const upsertValidatorStatus = async (validatorStatus: ValidatorStatus) => {
    const validatorStatusInDb = await queryByStash(validatorStatus.stashId);
    if (validatorStatusInDb) {
        ValidatorStatusSchema.updateOne({
            _id: validatorStatusInDb._id
        }, {
            $set: {
                stashId: validatorStatus.stashId,
                beValCount: validatorStatus.beValCount,
                beCanEra: validatorStatus.beCanEra,
                offlineCount: validatorStatus.offlineCount,
            }
        })
    } else {
        await saveNewValidatorStatus(validatorStatus);
    }
}

export const queryAll = async () => {
    return ValidatorStatusSchema.find().exec();
}