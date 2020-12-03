import {BlocksSchema} from "../model/schema";
import {BlockInfo} from "../model/interface";
import {logger} from "../log";
import {parseObj} from "../util";

export const queryByBlockNumber = async (blockNumber: number) => {
    return BlocksSchema.findOne({
        blockNumber
    }).exec()
}

export const saveNewBlock= async (block: BlockInfo) => {
    logger.info(`new block ${block}`)
    const blockSchema = new BlocksSchema(parseObj(block));
    const blockInDb = await queryByBlockNumber(block.blockNumber);
    if (!blockInDb) {
        blockSchema.save();
    }
}

export const queryLatestBlockInDb = async () => {
    return await BlocksSchema.findOne()
        .sort({ blockNumber: -1 })
        .skip(0)
        .limit(1)
        .exec();
}