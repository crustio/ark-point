export interface Miner {
    stash: string,
    capacity: number,
    offlineRate: number,
    beValRate: number,
    workReportRate: number,
    point: number,
    eraIndex: number
}

export interface ReportStatus {
    controller: string, // ControllerId
    pubKey: string, // PubKey
    capacity: number, // Total bytes
    count: number, // Reported count
    latestSlot: number, // Latest reported slot
    chillSlot: number, // Chilled report slot
    jointSlot: number, // First join report slot
}

export interface ValidatorStatus {
    stashId: string, // StashId
    beValCount: number, // Be validator count
    beCanEra: number, // Be candidate/validator era index
    offlineCount: number, // Offline count (session count)
}

export interface ErasInfo {
    // eraIndex
    eraIndex: number,
    // sessionIndex
    sessionIndex: number,
    // reportSlot
    reportSlot: number,
    // validators
    validator: Bonded[],
    // candidates
    candidates: Bonded[]
}

export interface Bonded {
    stash: string,
    controller: string
}