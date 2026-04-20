import * as Server from '../index'
import * as DataSource from '../DataSource'
import logger from '../utils/logger'
import { BaseCommand } from './base'

export default class WebSocket extends BaseCommand {
    async run(): Promise<void> {
        logger.info('Starting Flowise WebSocket Server...')

        // Override mode and port for WebSocket server
        process.env.MODE = 'ws-only'
        process.env.PORT = process.env.WS_PORT || '3001'

        await DataSource.init()
        await Server.start()
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
            logger.info(`Shutting down Flowise WebSocket Server...`)
            const serverApp = Server.getInstance()
            if (serverApp) await serverApp.stopApp()
        } catch (error) {
            logger.error('There was an error shutting down Flowise WebSocket Server...', error)
            await this.failExit()
        }

        await this.gracefullyExit()
    }
}
