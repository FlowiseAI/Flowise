import { DataSource } from 'typeorm'
import { IComponentNodes } from './Interface'
import { Telemetry } from './utils/telemetry'
import { CachePool } from './CachePool'
import { UsageCacheManager } from './UsageCacheManager'

export interface IScheduleQueueAppServer {
    appDataSource: DataSource
    componentNodes: IComponentNodes
    telemetry: Telemetry
    cachePool: CachePool
    usageCacheManager: UsageCacheManager
}

export interface IScheduleAgentflowJobData extends IScheduleQueueAppServer {
    scheduleRecordId: string
    targetId: string
    cronExpression: string
    timezone: string
    defaultInput?: string
    workspaceId: string
    scheduledAt: string // ISO string
}
