import * as Server from '../index'
import * as DataSource from '../DataSource'
import logger from '../utils/logger'
import { BaseCommand } from './base'
import { debugS3Configuration, isS3ConfigValid } from '../utils/s3-debug'

export default class Start extends BaseCommand {
    async run(): Promise<void> {
        logger.info('Starting Flowise...')

        // Always show S3 configuration on startup (not sensitive, helpful for troubleshooting)
        debugS3Configuration()
        // Check if S3 config is valid and warn if not
        if (!isS3ConfigValid()) {
            logger.error('⚠️  S3 configuration issues detected! The application may fail to start.')
            logger.error('   Please check the S3 configuration debug output above.')
        }

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
            logger.info(`Shutting down Flowise...`)
            const serverApp = Server.getInstance()
            if (serverApp) await serverApp.stopApp()
        } catch (error) {
            logger.error('There was an error shutting down Flowise...', error)
            await this.failExit()
        }

        await this.gracefullyExit()
    }
}
