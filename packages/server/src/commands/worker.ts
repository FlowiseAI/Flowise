import logger from '../utils/logger'
import { QueueManager } from '../queue/QueueManager'
import { BaseCommand } from './base'
import { getDataSource } from '../DataSource'
import { Telemetry } from '../utils/telemetry'
import { NodesPool } from '../NodesPool'
import { CachePool } from '../CachePool'
import { ChatflowPool } from '../ChatflowPool'
import { QueueEvents, QueueEventsListener } from 'bullmq'

interface CustomListener extends QueueEventsListener {
    abort: (args: { id: string }, id: string) => void
}

export default class Worker extends BaseCommand {
    workerId: string

    async run(): Promise<void> {
        logger.info('Starting Flowise Worker...')

        const { appDataSource, telemetry, componentNodes, cachePool, chatflowPool } = await this.prepareData()

        const queueManager = QueueManager.getInstance({ appDataSource, telemetry, componentNodes, cachePool, chatflowPool })
        const queueName = QueueManager.getQueueName()
        const worker = queueManager.createWorker()
        this.workerId = worker.id

        const queueEvents = new QueueEvents(queueName)

        queueEvents.on<CustomListener>('abort', async ({ id }: { id: string }) => {
            const endingNodeData = chatflowPool.activeChatflows[`${id}`]?.endingNodeData as any
            if (endingNodeData && endingNodeData.signal) {
                try {
                    endingNodeData.signal.abort()
                    await chatflowPool.remove(`${id}`)
                } catch (e) {
                    logger.error(`[Worker ${this.workerId}]: Error aborting chat message for ${id}: ${e}`)
                }
            }
        })

        logger.info(`Worker ${worker.id} created`)
        // Keep the process running
        process.stdin.resume()
    }

    async prepareData() {
        // Init database
        const appDataSource = getDataSource()
        await appDataSource.initialize()
        await appDataSource.runMigrations({ transaction: 'each' })

        // Initialize chatflow pool
        const chatflowPool = new ChatflowPool()

        // Init telemetry
        const telemetry = new Telemetry()

        // Initialize nodes pool
        const nodesPool = new NodesPool()
        await nodesPool.initialize()

        // Initialize cache pool
        const cachePool = new CachePool()

        return { appDataSource, telemetry, componentNodes: nodesPool.componentNodes, cachePool, chatflowPool }
    }

    async catch(error: Error) {
        if (error.stack) logger.error(error.stack)
        await new Promise((resolve) => {
            setTimeout(resolve, 1000)
        })
        await this.failExit()
    }

    async stopProcess() {
        try {
            logger.info(`Shutting down Flowise Worker ${this.workerId}...`)
            //const serverApp = Server.getInstance()
            //if (serverApp) await serverApp.stopApp()
        } catch (error) {
            logger.error('There was an error shutting down Flowise Worker...', error)
            await this.failExit()
        }

        await this.gracefullyExit()
    }
}
