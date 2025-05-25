import { Trigger } from '../database/entities/Trigger'
import { TriggerEvent } from '../database/entities/TriggerEvent'
import { DataSource } from 'typeorm'
import { IChatFlow } from '../Interface'
import { getDataSource } from '../database/dataSource'
import { IncomingHttpHeaders } from 'http'
import axios from 'axios'
import logger from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import * as cron from 'node-cron'

export class TriggerSchedulerService {
    private dataSource: DataSource
    private cronJobs: Map<string, cron.ScheduledTask> = new Map()
    private isInitialized = false

    constructor() {
        this.initialize()
    }

    async initialize() {
        try {
            this.dataSource = await getDataSource()
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
            const triggerRepository = this.dataSource.getRepository(Trigger)
            const activeTriggers = await triggerRepository.find({
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
                        this.executeTrigger(trigger)
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
                        this.executeTrigger(trigger)
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

    async executeTrigger(trigger: Trigger, payload: any = {}) {
        try {
            logger.info(`Executing trigger ${trigger.id} (${trigger.name})`)

            // Get chatflow
            const chatflowRepository = this.dataSource.getRepository('chatflows')
            const chatflow = await chatflowRepository.findOne({
                where: { id: trigger.chatflowId }
            }) as IChatFlow

            if (!chatflow) {
                logger.error(`Chatflow ${trigger.chatflowId} not found for trigger ${trigger.id}`)
                return
            }

            // Create trigger event record
            const triggerEventRepository = this.dataSource.getDataSource().getRepository(TriggerEvent)
            const triggerEvent = new TriggerEvent()
            triggerEvent.id = uuidv4()
            triggerEvent.triggerId = trigger.id
            triggerEvent.status = 'PROCESSING'
            triggerEvent.payload = JSON.stringify(payload)
            triggerEvent.startedAt = new Date()
            await triggerEventRepository.save(triggerEvent)

            // Execute chatflow
            const baseURL = process.env.FLOWISE_BASE_URL || 'http://localhost:3000'
            const apiPath = `/api/v1/prediction/${chatflow.id}`
            const headers: IncomingHttpHeaders = {}

            // Add API key if available
            if (process.env.FLOWISE_APIKEY_PATH) {
                headers['Authorization'] = `Bearer ${process.env.FLOWISE_APIKEY_PATH}`
            }

            // Execute the chatflow
            const response = await axios.post(`${baseURL}${apiPath}`, {
                question: 'Trigger execution',
                overrideConfig: {
                    ...payload,
                    sessionId: triggerEvent.id
                }
            }, { headers })

            // Update trigger event with result
            triggerEvent.status = 'COMPLETED'
            triggerEvent.result = JSON.stringify(response.data)
            triggerEvent.completedAt = new Date()
            await triggerEventRepository.save(triggerEvent)

            logger.info(`Trigger ${trigger.id} executed successfully`)
            return response.data
        } catch (error) {
            logger.error(`Error executing trigger ${trigger.id}:`, error)

            // Update trigger event with error
            try {
                const triggerEventRepository = this.dataSource.getDataSource().getRepository(TriggerEvent)
                const triggerEvent = await triggerEventRepository.findOne({
                    where: { triggerId: trigger.id, status: 'PROCESSING' }
                })

                if (triggerEvent) {
                    triggerEvent.status = 'FAILED'
                    triggerEvent.error = error.message || 'Unknown error'
                    triggerEvent.completedAt = new Date()
                    await triggerEventRepository.save(triggerEvent)
                }
            } catch (dbError) {
                logger.error('Error updating trigger event status:', dbError)
            }

            throw error
        }
    }

    async handleWebhookTrigger(triggerId: string, payload: any) {
        try {
            const triggerRepository = this.dataSource.getRepository(Trigger)
            const trigger = await triggerRepository.findOne({
                where: { id: triggerId, isActive: true }
            })

            if (!trigger) {
                throw new Error(`Trigger ${triggerId} not found or inactive`)
            }

            return await this.executeTrigger(trigger, payload)
        } catch (error) {
            logger.error(`Error handling webhook trigger ${triggerId}:`, error)
            throw error
        }
    }

    async refreshTrigger(triggerId: string) {
        try {
            const triggerRepository = this.dataSource.getRepository(Trigger)
            const trigger = await triggerRepository.findOne({
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