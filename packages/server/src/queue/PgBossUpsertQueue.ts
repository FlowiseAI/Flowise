// packages/server/src/queue/PgBossUpsertQueue.ts
import { PgBossQueue } from './PgBossQueue';
import { DataSource } from 'typeorm';
import {
    IComponentNodes,
    IExecuteDocStoreUpsert,
    IExecuteFlowParams,
    IExecutePreviewLoader,
    IExecuteProcessLoader,
    IExecuteVectorStoreInsert
} from '../Interface';
import { Telemetry } from '../utils/telemetry';
import { CachePool } from '../CachePool';
import { executeUpsert } from '../utils/upsertVector';
import { executeDocStoreUpsert, insertIntoVectorStore, previewChunks, processLoader } from '../services/documentstore';
import logger from '../utils/logger';
import { UsageCacheManager } from '../UsageCacheManager';

// This interface is defined in the original UpsertQueue.ts
interface UpsertQueueOptions {
    appDataSource: DataSource;
    telemetry: Telemetry;
    cachePool: CachePool;
    usageCacheManager: UsageCacheManager;
    componentNodes: IComponentNodes;
}

export class PgBossUpsertQueue extends PgBossQueue {
    private componentNodes: IComponentNodes;
    private telemetry: Telemetry;
    private cachePool: CachePool;
    private appDataSource: DataSource;
    private usageCacheManager: UsageCacheManager;

    constructor(name: string, pgBossOptions: any, options: UpsertQueueOptions) {
        super(name, pgBossOptions); // Pass pgBossOptions to PgBossQueue constructor
        this.componentNodes = options.componentNodes || {};
        this.telemetry = options.telemetry;
        this.cachePool = options.cachePool;
        this.appDataSource = options.appDataSource;
        this.usageCacheManager = options.usageCacheManager;
    }

    public async processJob(
        data: IExecuteFlowParams | IExecuteDocStoreUpsert | IExecuteProcessLoader | IExecuteVectorStoreInsert | IExecutePreviewLoader
    ): Promise<any> {
        // This is the exact same logic as in the original UpsertQueue's processJob
        if (this.appDataSource) data.appDataSource = this.appDataSource;
        if (this.telemetry) data.telemetry = this.telemetry;
        if (this.cachePool) data.cachePool = this.cachePool;
        if (this.usageCacheManager) data.usageCacheManager = this.usageCacheManager;
        if (this.componentNodes) data.componentNodes = this.componentNodes;

        if (Object.prototype.hasOwnProperty.call(data, 'isPreviewOnly')) {
            logger.info('(pg-boss) Previewing loader...');
            return await previewChunks(data as IExecutePreviewLoader);
        }

        if (Object.prototype.hasOwnProperty.call(data, 'isProcessWithoutUpsert')) {
            logger.info('(pg-boss) Processing loader...');
            return await processLoader(data as IExecuteProcessLoader);
        }

        if (Object.prototype.hasOwnProperty.call(data, 'isVectorStoreInsert')) {
            logger.info('(pg-boss) Inserting vector store...');
            return await insertIntoVectorStore(data as IExecuteVectorStoreInsert);
        }

        if (Object.prototype.hasOwnProperty.call(data, 'storeId')) {
            logger.info('(pg-boss) Upserting to vector store via document loader...');
            return await executeDocStoreUpsert(data as IExecuteDocStoreUpsert);
        }

        logger.info('(pg-boss) Upserting to vector store via chatflow...');
        return await executeUpsert(data as IExecuteFlowParams);
    }
}
