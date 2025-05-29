import { DataSource, Repository } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getDataSource } from '../../DataSource'
import { Trigger } from '../../database/entities/Trigger'
import { TriggerEvent } from '../../database/entities/TriggerEvent'
import { ICommonObject } from '../../Interface'
import logger from '../../utils/logger'
import * as cron from 'node-cron'
import { TriggerService } from './TriggerService'

interface CustomScheduledTask {
    type: 'timeout'; // Discriminant property
    stop: () => void;
    start: () => void;
    getStatus: () => string;
}

export class TriggerSchedulerService {
    private dataSource: DataSource
    private triggerRepository: Repository<Trigger>
    private triggerService: TriggerService
    private cronJobs: Map<string, cron.ScheduledTask | CustomScheduledTask> = new Map()
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
                    logger.info(`[DEBUG] About to create custom timeout task object for trigger ${trigger.id} (${trigger.name})`);
                    const taskObject = {
                        type: 'timeout' as const,
                        stop: () => clearTimeout(timeoutId),
                        start: () => {},
                        getStatus: () => 'scheduled'
                    };
                    logger.info(`[DEBUG] Created taskObject:`, JSON.stringify(taskObject));
                    logger.info(`[DEBUG] typeof taskObject: ${typeof taskObject}`);
                    // Try to assign to cronJobs and log the type
                    try {
                        // Uncomment to test assignment and log
                        // this.cronJobs.set(trigger.id, taskObject as unknown as CustomScheduledTask);
                        logger.info(`[DEBUG] Successfully assigned taskObject to cronJobs for trigger ${trigger.id}`);
                    } catch (err) {
                        logger.error(`[ERROR] Failed to assign taskObject to cronJobs:`, err);
                    }

                    logger.info(`Scheduled one-time trigger ${trigger.id} (${trigger.name}) for ${triggerDate.toISOString()}`);
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
            logger.error(`[TOP-LEVEL ERROR] scheduleTrigger failed for trigger ${trigger?.id} (${trigger?.name}):`, error);
            if (error instanceof TypeError) {
                logger.error('[TypeError details]', error.message);
            } else if (error instanceof Error) {
                logger.error('[Error details]', error.stack);
            } else {
                logger.error('[Unknown error type]', error);
            }
        }
    }

    private getTaskType(task: cron.ScheduledTask | CustomScheduledTask): string {
        // 'now' is a method in cron.ScheduledTask but not CustomScheduledTask
        // and 'getStatus' is in CustomScheduledTask but not necessarily unique enough if cron.ScheduledTask also has it.
        // A more robust check might be needed if cron.ScheduledTask also has getStatus or if CustomScheduledTask gains more properties.
        // For now, checking for a known method unique to cron.ScheduledTask like 'now' (or others like 'lastDate') is safer.
        if (typeof (task as cron.ScheduledTask).now === 'function') {
            return 'cron';
        }
        return 'timeout';
    }

    public stopAndRemoveJob(triggerId: string): boolean {
        const job = this.cronJobs.get(triggerId);
        if (job) {
            job.stop();
            this.cronJobs.delete(triggerId);
            logger.info(`Stopped and removed job for trigger ${triggerId}`);
            return true;
        }
        logger.warn(`Job for trigger ${triggerId} not found for stopping.`);
        return false;
    }

    public getJobDetails(triggerId: string): { status: string, type: string } | undefined {
        const job = this.cronJobs.get(triggerId);
        if (job) {
            const taskType = this.getTaskType(job);
            let status: string;

            if (taskType === 'timeout') {
                status = (job as CustomScheduledTask).getStatus();
            } else { // taskType === 'cron'
                // cron.ScheduledTask doesn't have a getStatus().
                // If it's in our map, we consider it 'active'.
                status = 'active'; 
            }
            return {
                status: status,
                type: taskType
            };
        }
        return undefined;
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