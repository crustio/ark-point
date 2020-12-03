import {ErasInfoSchema} from "../model/schema";
import {ErasInfo} from "../model/interface";
import {parseObj} from "../util";

export const queryByEraIndex = async (eraIndex: number) => {
    return ErasInfoSchema.findOne({
        eraIndex
    }).exec()
}

export const saveNewErasInfo = async (erasInfo: ErasInfo) => {
    const erasInfoSchema = new ErasInfoSchema(parseObj(erasInfo));
    const erasInfoInDb = await queryByEraIndex(erasInfo.eraIndex);
    if (!erasInfoInDb) {
        erasInfoSchema.save();
    }
}