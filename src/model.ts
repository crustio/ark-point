export interface Miner {
    capacity: number,
    offlineRate: number,
    beValRate: number,
    workReportRate: number,
    totalPoints: number
}

export interface ReportStatus {
    capacity: number, // Total bytes
    count: number, // Reported count
    slot: number, // Latest reported slot
    chillSlot: number, // Chilled report slot
    jointSlot: number, // First join report slot
}

export interface ValidatorStatus {
    beValCount: number, // Be validator count
    beCanEra: number, // Be candidate/validator era index
    offlineCount: number, // Offline count (session count)
}