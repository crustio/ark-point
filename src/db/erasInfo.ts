import {ErasInfoSchema} from "../model/schema";
import {ErasInfo} from "../model/interface";

export const queryByEraIndex = async (eraIndex: number) => {
    return ErasInfoSchema.findOne({
        eraIndex
    }).exec()
}

export const saveNewErasInfo = async (erasInfo: ErasInfo) => {
    const erasInfoSchema = new ErasInfoSchema(erasInfo);
    const erasInfoInDb = await queryByEraIndex(erasInfo.eraIndex);
    if (!erasInfoInDb) {
        erasInfoSchema.save();
    }
}