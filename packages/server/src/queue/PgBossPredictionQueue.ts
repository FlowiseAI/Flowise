// packages/server/src/queue/PgBossPredictionQueue.ts
import { PgBossQueue } from './PgBossQueue';
import { DataSource } from 'typeorm';
import { executeFlow } from '../utils/buildChatflow';
import { IComponentNodes, IExecuteFlowParams } from '../Interface';
import { Telemetry } from '../utils/telemetry';
import { CachePool } from '../CachePool';
import { AbortControllerPool } from '../AbortControllerPool';
import { UsageCacheManager } from '../UsageCacheManager';
import logger from '../utils/logger';
import { generateAgentflowv2 as generateAgentflowv2_json } from 'flowise-components';
import { databaseEntities } from '../utils';
import { executeCustomNodeFunction } from '../utils/executeCustomNodeFunction';

// This interface is defined in the original PredictionQueue.ts
interface PredictionQueueOptions {
    appDataSource: DataSource;
    telemetry: Telemetry;
    cachePool: CachePool;
    componentNodes: IComponentNodes;
    abortControllerPool: AbortControllerPool;
    usageCacheManager: UsageCacheManager;
}

interface IGenerateAgentflowv2Params extends IExecuteFlowParams {
    prompt: string;
    componentNodes: IComponentNodes;
    toolNodes: IComponentNodes;
    selectedChatModel: Record<string, any>;
    question: string;
    isAgentFlowGenerator: boolean;
}


export class PgBossPredictionQueue extends PgBossQueue {
    private componentNodes: IComponentNodes;
    private telemetry: Telemetry;
    private cachePool: CachePool;
    private appDataSource: DataSource;
    private abortControllerPool: AbortControllerPool;
    private usageCacheManager: UsageCacheManager;
    // sseStreamer/RedisEventPublisher is Redis specific, so we don't include it here.
    // If event streaming is needed with pg-boss, a different mechanism would be required (e.g., pg_notify).

    constructor(name: string, pgBossOptions: any, options: PredictionQueueOptions) {
        super(name, pgBossOptions); // Pass pgBossOptions to PgBossQueue constructor
        this.componentNodes = options.componentNodes || {};
        this.telemetry = options.telemetry;
        this.cachePool = options.cachePool;
        this.appDataSource = options.appDataSource;
        this.abortControllerPool = options.abortControllerPool;
        this.usageCacheManager = options.usageCacheManager;
        // No RedisEventPublisher here
    }

    public async processJob(data: IExecuteFlowParams | IGenerateAgentflowv2Params): Promise<any> {
        // This is the exact same logic as in the original PredictionQueue's processJob
        if (this.appDataSource) data.appDataSource = this.appDataSource;
        if (this.telemetry) data.telemetry = this.telemetry;
        if (this.cachePool) data.cachePool = this.cachePool;
        if (this.usageCacheManager) data.usageCacheManager = this.usageCacheManager;
        if (this.componentNodes) data.componentNodes = this.componentNodes;

        // sseStreamer is Redis specific, so we don't pass it for pg-boss.
        // if (this.redisPublisher) data.sseStreamer = this.redisPublisher;
        // This means server-sent events for predictions won't work out-of-the-box with pg-boss
        // without further changes to how SSE is implemented.

        if (Object.prototype.hasOwnProperty.call(data, 'isAgentFlowGenerator')) {
            logger.info(`(pg-boss) Generating Agentflow...`);
            const { prompt, componentNodes, toolNodes, selectedChatModel, question } = data as IGenerateAgentflowv2Params;
            const options_params: Record<string, any> = { // Renamed to avoid conflict with constructor options
                appDataSource: this.appDataSource,
                databaseEntities: databaseEntities,
                logger: logger
            };
            return await generateAgentflowv2_json({ prompt, componentNodes, toolNodes, selectedChatModel }, question, options_params);
        }

        if (Object.prototype.hasOwnProperty.call(data, 'isExecuteCustomFunction')) {
            const executeCustomFunctionData = data as any;
            logger.info(`(pg-boss) [${executeCustomFunctionData.orgId}]: Executing Custom Function...`);
            return await executeCustomNodeFunction({
                appDataSource: this.appDataSource,
                componentNodes: this.componentNodes,
                data: executeCustomFunctionData.data
            });
        }

        if (this.abortControllerPool) {
            const abortControllerId = `${data.chatflow.id}_${data.chatId}`;
            const signal = new AbortController();
            this.abortControllerPool.add(abortControllerId, signal);
            data.signal = signal;
        }

        return await executeFlow(data);
    }
}
