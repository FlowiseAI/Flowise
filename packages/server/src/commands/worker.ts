import logger from '../utils/logger'
import { QueueManager } from '../queue/QueueManager'
import { BaseCommand } from './base'
import { getDataSource } from '../DataSource'
import { Telemetry } from '../utils/telemetry'
import { NodesPool } from '../NodesPool'
import { CachePool } from '../CachePool'

export default class Worker extends BaseCommand {
    workerId: string

    async run(): Promise<void> {
        logger.info('Starting Flowise Worker...')
        const { appDataSource, telemetry, componentNodes, cachePool } = await this.prepareData()
        const queueManager = QueueManager.getInstance({ appDataSource, telemetry, componentNodes, cachePool })
        const worker = queueManager.createWorker()
        this.workerId = worker.id
        logger.info(`Worker ${worker.id} created`)
        // Keep the process running
        process.stdin.resume()
    }

    async prepareData() {
        // Init database
        const appDataSource = getDataSource()
        await appDataSource.initialize()
        await appDataSource.runMigrations({ transaction: 'each' })

        // Init telemetry
        const telemetry = new Telemetry()

        // Initialize nodes pool
        const nodesPool = new NodesPool()
        await nodesPool.initialize()

        // Initialize cache pool
        const cachePool = new CachePool()

        return { appDataSource, telemetry, componentNodes: nodesPool.componentNodes, cachePool }
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
