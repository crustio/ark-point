import {ReportStatusSchema} from "../model/schema";
import {ReportStatus} from "../model/interface";
import {parseObj} from "../util";

export const queryReportStatusByController = async (controller: string) =>{
    return ReportStatusSchema.findOne({
        controller
    }).exec();
};

export const saveNewReportStatus = async (reportStatus: ReportStatus) => {
    const reportStatusSchema = new ReportStatusSchema(parseObj(reportStatus));
    const reportStatusInDb = await queryReportStatusByController(reportStatus.controller);
    if (!reportStatusInDb) {
        reportStatusSchema.save();
    }
}

export const upsertReportStatus = async (reportStatus: ReportStatus) => {
    const reportStatusInDb = await queryReportStatusByController(reportStatus.controller);
    if (reportStatusInDb) {
        ReportStatusSchema.updateOne({
            _id: reportStatusInDb._id
        }, {
            $set: {
                controller: reportStatus.controller,
                pubKey: reportStatus.pubKey,
                capacity: reportStatus.capacity,
                count: reportStatus.count,
                latestSlot: reportStatus.latestSlot,
                chillSlot: reportStatus.chillSlot,
                jointSlot: reportStatus.jointSlot,
            }
        })
    } else {
        await saveNewReportStatus(reportStatus);
    }
}

export const queryByControllerAndPubKey = async (controller: string, publicKey: string) => {
    return await ReportStatusSchema.findOne({
        controller,
        publicKey
    }).exec();
}