import cron from 'node-cron'
import axios from 'axios'
import logger from './logger'
import initCsvRun from '../jobs/initCsvRun'
import processCsvRows from '../jobs/processCsvRows'
import generateCsv from '../jobs/generateCsv'

/**
 * Cron job schedule for billing usage sync
 * Default: Every 15 minutes ('0/15 * * * *')
 */
const BILLING_SYNC_CRON_SCHEDULE = process.env.BILLING_SYNC_CRON_SCHEDULE || '*/15 * * * *'

/**
 * Base URL for the API request
 * Default: http://localhost:{PORT} where PORT is the server port
 */
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`

/**
 * Flag to enable/disable billing sync cron job
 * Default: true
 */
const ENABLE_BILLING_SYNC_CRON = process.env.ENABLE_BILLING_SYNC_CRON !== 'false'

/**
 * Initialize cron jobs
 */
export function initCronJobs() {
    if (ENABLE_BILLING_SYNC_CRON) {
        logger.info(`📅 [cron]: Initializing billing usage sync cron job with schedule: ${BILLING_SYNC_CRON_SCHEDULE}`)

        // Validate cron schedule
        if (!cron.validate(BILLING_SYNC_CRON_SCHEDULE)) {
            logger.error(`❌ [cron]: Invalid cron schedule for billing sync: ${BILLING_SYNC_CRON_SCHEDULE}`)
            return
        }

        // Schedule billing usage sync job
        cron.schedule(BILLING_SYNC_CRON_SCHEDULE, async () => {
            try {
                logger.info('📅 [cron]: Running billing usage sync job')
                const response = await axios.post(`${API_BASE_URL}/api/v1/billing/usage/sync`, {})
                logger.info(`📅 [cron]: Billing usage sync completed with status: ${response.status}`)
            } catch (error) {
                logger.error('❌ [cron]: Error running billing usage sync:', error)
            }
        })
    } else {
        logger.info('📅 [cron]: Billing usage sync cron job is disabled')
    }

    initCsvRun()
    processCsvRows()
    generateCsv()
}
