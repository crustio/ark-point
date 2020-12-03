import {Miner} from "../model/interface";
import {MinerPointsSchema} from "../model/schema";
import {parseObj} from "../util";

export const queryByStashAndEraIndex = async (stash: string, eraIndex: number) => {
    return await MinerPointsSchema.findOne(
        {
            stash,
            eraIndex
        }
    ).exec();
}

export const saveNewMinerPoint = async (miner: Miner) => {
    const minerPointsInDb = await queryByStashAndEraIndex(miner.stash, miner.eraIndex);
    if (!minerPointsInDb) {
        const newMinerPoints = new MinerPointsSchema(parseObj(miner));
        newMinerPoints.save();
    }
}

export const queryAll = async () => {
    return MinerPointsSchema.find().exec();
}