import { DataSource, Repository } from 'typeorm'
import { Trigger } from '../../database/entities/Trigger'
import { TriggerEvent } from '../../database/entities/TriggerEvent'
import { getDataSource } from '../../database/dataSource'
import { ICommonObject } from '../../Interface'
import logger from '../../utils/logger'
import * as cron from 'node-cron'
import { TriggerService } from './TriggerService'

export class TriggerSchedulerService {
    private dataSource: DataSource
    private triggerRepository: Repository<Trigger>
    private triggerService: TriggerService
    private cronJobs: Map<string, cron.ScheduledTask> = new Map()
    private isInitialized = false

    constructor() {
        this.initialize()
    }

    async initialize() {
        try {
            this.dataSource = await getDataSource()
            this.triggerRepository = this.dataSource.getRepository(Trigger)
            this.triggerService = new TriggerService(this.dataSource)
            this.isInitialized = true
            await this.loadActiveTriggers()
            logger.info('Trigger scheduler service initialized')
        } catch (error) {
            logger.error('Error initializing trigger scheduler service:', error)
        }
    }

    async loadActiveTriggers() {
        if (!this.isInitialized) {
            await this.initialize()
        }

        try {
            const activeTriggers = await this.triggerRepository.find({
                where: { isActive: true }
            })

            // Clear existing cron jobs
            for (const [, job] of this.cronJobs) {
                job.stop()
            }
            this.cronJobs.clear()

            // Schedule active triggers
            for (const trigger of activeTriggers) {
                await this.scheduleTrigger(trigger)
            }

            logger.info(`Loaded ${activeTriggers.length} active triggers`)
        } catch (error) {
            logger.error('Error loading active triggers:', error)
        }
    }

    async scheduleTrigger(trigger: Trigger) {
        if (!trigger.isActive) return

        try {
            const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config

            if (trigger.type === 'calendar') {
                // Handle calendar-based triggers
                if (config.schedule === 'once') {
                    // One-time scheduled event
                    const triggerDate = new Date(config.date)
                    if (config.time) {
                        const [hours, minutes] = config.time.split(':').map(Number)
                        triggerDate.setHours(hours, minutes, 0, 0)
                    }

                    // If the date is in the past, don't schedule
                    if (triggerDate.getTime() < Date.now()) {
                        logger.warn(`Trigger ${trigger.id} (${trigger.name}) has a past date and won't be scheduled`)
                        return
                    }

                    // Schedule one-time job
                    const delay = triggerDate.getTime() - Date.now()
                    const timeoutId = setTimeout(() => {
                        this.triggerService.executeTrigger(trigger.id)
                        // Remove from active triggers after execution
                        this.cronJobs.delete(trigger.id)
                    }, delay)

                    // Store the timeout ID as a cron job for consistency
                    this.cronJobs.set(trigger.id, {
                        stop: () => clearTimeout(timeoutId),
                        start: () => {}, // No-op for timeouts
                        getStatus: () => 'scheduled'
                    } as cron.ScheduledTask)

                    logger.info(`Scheduled one-time trigger ${trigger.id} (${trigger.name}) for ${triggerDate.toISOString()}`)
                } else if (config.schedule === 'recurring') {
                    // Recurring event using cron
                    let cronExpression = '* * * * *' // Default: every minute

                    // Convert repeat pattern to cron expression
                    switch (config.repeat) {
                        case 'hourly':
                            cronExpression = `0 * * * *` // Every hour at minute 0
                            break
                        case 'daily':
                            if (config.time) {
                                const [hours, minutes] = config.time.split(':').map(Number)
                                cronExpression = `${minutes} ${hours} * * *` // Every day at specified time
                            } else {
                                cronExpression = '0 0 * * *' // Every day at midnight
                            }
                            break
                        case 'weekly':
                            if (config.dayOfWeek !== undefined) {
                                if (config.time) {
                                    const [hours, minutes] = config.time.split(':').map(Number)
                                    cronExpression = `${minutes} ${hours} * * ${config.dayOfWeek}` // Every week on specified day at specified time
                                } else {
                                    cronExpression = `0 0 * * ${config.dayOfWeek}` // Every week on specified day at midnight
                                }
                            } else {
                                cronExpression = '0 0 * * 1' // Every Monday at midnight
                            }
                            break
                        case 'monthly':
                            if (config.dayOfMonth !== undefined) {
                                if (config.time) {
                                    const [hours, minutes] = config.time.split(':').map(Number)
                                    cronExpression = `${minutes} ${hours} ${config.dayOfMonth} * *` // Every month on specified day at specified time
                                } else {
                                    cronExpression = `0 0 ${config.dayOfMonth} * *` // Every month on specified day at midnight
                                }
                            } else {
                                cronExpression = '0 0 1 * *' // Every 1st of month at midnight
                            }
                            break
                        case 'custom':
                            if (config.cronExpression) {
                                cronExpression = config.cronExpression // Custom cron expression
                            }
                            break
                    }

                    // Schedule recurring job
                    const job = cron.schedule(cronExpression, () => {
                        this.triggerService.executeTrigger(trigger.id)
                    })

                    this.cronJobs.set(trigger.id, job)
                    logger.info(`Scheduled recurring trigger ${trigger.id} (${trigger.name}) with cron: ${cronExpression}`)
                }
            } else if (trigger.type === 'webhook') {
                // Webhook triggers are executed on demand, not scheduled
                logger.info(`Registered webhook trigger ${trigger.id} (${trigger.name})`)
            }
        } catch (error) {
            logger.error(`Error scheduling trigger ${trigger.id} (${trigger.name}):`, error)
        }
    }

    async handleWebhookTrigger(triggerId: string, payload: ICommonObject = {}) {
        try {
            return await this.triggerService.executeTrigger(triggerId, payload)
        } catch (error) {
            logger.error(`Error handling webhook trigger ${triggerId}:`, error)
            throw error
        }
    }

    async refreshTrigger(triggerId: string) {
        try {
            const trigger = await this.triggerRepository.findOne({
                where: { id: triggerId }
            })

            if (!trigger) {
                throw new Error(`Trigger ${triggerId} not found`)
            }

            // Stop existing job if any
            const existingJob = this.cronJobs.get(triggerId)
            if (existingJob) {
                existingJob.stop()
                this.cronJobs.delete(triggerId)
            }

            // Schedule if active
            if (trigger.isActive) {
                await this.scheduleTrigger(trigger)
            }

            logger.info(`Trigger ${triggerId} refreshed`)
        } catch (error) {
            logger.error(`Error refreshing trigger ${triggerId}:`, error)
            throw error
        }
    }
}

// Singleton instance
export const triggerSchedulerService = new TriggerSchedulerService()