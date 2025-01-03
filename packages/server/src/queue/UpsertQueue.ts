import dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { IComponentNodes, IExecuteDocStoreUpsert, IExecuteFlowParams, IExecuteProcessLoader, IExecuteVectorStoreInsert } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { BaseQueue } from './BaseQueue'
import { executeUpsert } from '../utils/upsertVector'
import { executeDocStoreUpsert, insertIntoVectorStore, processLoader } from '../services/documentstore'
import { RedisOptions } from 'bullmq'
import logger from '../utils/logger'

dotenv.config()

interface UpsertQueueOptions {
    appDataSource: DataSource
    telemetry: Telemetry
    cachePool: CachePool
    componentNodes: IComponentNodes
}

export class UpsertQueue extends BaseQueue {
    private componentNodes: IComponentNodes
    private telemetry: Telemetry
    private cachePool: CachePool
    private appDataSource: DataSource
    private queueName: string

    constructor(name: string, connection: RedisOptions, options: UpsertQueueOptions) {
        super(name, connection)
        this.queueName = name
        this.componentNodes = options.componentNodes || {}
        this.telemetry = options.telemetry
        this.cachePool = options.cachePool
        this.appDataSource = options.appDataSource
    }

    public getQueueName() {
        return this.queueName
    }

    public getQueue() {
        return this.queue
    }

    async processJob(data: IExecuteFlowParams | IExecuteDocStoreUpsert | IExecuteProcessLoader | IExecuteVectorStoreInsert) {
        if (this.appDataSource) data.appDataSource = this.appDataSource
        if (this.telemetry) data.telemetry = this.telemetry
        if (this.cachePool) (data as any).cachePool = this.cachePool
        if (this.componentNodes) data.componentNodes = this.componentNodes

        // document-store/loader/process/:loaderId
        if (Object.prototype.hasOwnProperty.call(data, 'isProcessWithoutUpsert')) {
            logger.info('Processing loader...')
            return await processLoader(data as IExecuteProcessLoader)
        }

        // document-store/vectorstore/insert/:loaderId
        if (Object.prototype.hasOwnProperty.call(data, 'isVectorStoreInsert')) {
            logger.info('Inserting vector store...')
            return await insertIntoVectorStore(data as IExecuteVectorStoreInsert)
        }

        // document-store/upsert/:storeId
        if (Object.prototype.hasOwnProperty.call(data, 'storeId')) {
            logger.info('Upserting to vector store via document loader...')
            return await executeDocStoreUpsert(data as IExecuteDocStoreUpsert)
        }

        // upsert-vector/:chatflowid
        logger.info('Upserting to vector store via chatflow...')
        return await executeUpsert(data as IExecuteFlowParams)
    }
}