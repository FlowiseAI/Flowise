import { BaseQueue } from './BaseQueue';
import PgBoss from 'pg-boss';
import { Job } from 'bullmq'; // We'll keep this for now for compatibility, but might remove later
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Forward declare the options that will be passed to the pg-boss constructor
// We will get these from the main application configuration
// For now, we'll define a placeholder interface
interface PgBossOptions {
    connectionString?: string; // Example: 'postgresql://user:pass@host:port/database'
    // Add other pg-boss specific options if needed
    // We can refine this once we integrate with DataSource.ts
}

export class PgBossQueue extends BaseQueue {
    private boss: PgBoss;
    private queueName: string;

    constructor(queueName: string, pgBossOptions: PgBossOptions) {
        // We need to call super with a placeholder for RedisOptions,
        // as BaseQueue expects it. We'll address this later by either
        // making BaseQueue more generic or by creating a new base class.
        // For now, an empty object should suffice as we won't use Redis features.
        super(queueName, {} as any);
        this.queueName = queueName;

        if (!pgBossOptions.connectionString) {
            // In a real scenario, we'd fetch this from a config file or environment variable
            // and ensure it's properly configured before this class is instantiated.
            // This will be handled in the QueueManager update.
            logger.warn('pg-boss connection string is not provided. Using default from environment variable PGDATABASEURL.');
            // pg-boss defaults to process.env.PGDATABASEURL if no connectionString is provided
            this.boss = new PgBoss();
        } else {
            this.boss = new PgBoss(pgBossOptions.connectionString);
        }

        this.boss.on('error', error => logger.error(`pg-boss error: ${error.message}`, error));
        this.boss.start().then(() => {
            logger.info(`pg-boss started for queue: ${this.queueName}`);
        }).catch(error => {
            logger.error(`Failed to start pg-boss for queue ${this.queueName}: ${error.message}`, error);
        });
    }

    // We need to override methods from BaseQueue that interact with BullMQ's Queue object
    // For now, we'll implement them with pg-boss equivalents or placeholders

    public abstract processJob(data: any): Promise<any>; // This will be implemented by subclasses like PredictionQueue

    public getQueueName(): string {
        return this.queueName;
    }

    // This method needs to be overridden as BaseQueue.getQueue() returns a BullMQ Queue object
    // For pg-boss, there isn't a direct equivalent "Queue" object in the same way.
    // We might need to rethink what this method should return for pg-boss.
    // For now, let's return the pg-boss instance itself, or null/undefined.
    public getQueue(): any { // Type any for now
        logger.warn('getQueue() called on PgBossQueue. Returning pg-boss instance. This may not be compatible with all BaseQueue uses.');
        return this.boss;
    }

    public async addJob(jobData: any): Promise<any> { // Return type any for now, pg-boss returns string (jobId) or null
        const jobId = jobData.id || uuidv4();
        try {
            // pg-boss send() returns the ID of the job, or null if it couldn't be queued
            const createdJobId = await this.boss.send(this.queueName, jobData, { jobId });
            if (createdJobId) {
                logger.info(`Job ${createdJobId} added to pg-boss queue ${this.queueName}`);
                // We need to return something that looks like a BullMQ Job object for compatibility
                // This is a placeholder and might need more properties for full compatibility
                return { id: createdJobId, data: jobData, name: this.queueName };
            } else {
                logger.error(`Failed to add job to pg-boss queue ${this.queueName}. Job data: ${JSON.stringify(jobData)}`);
                throw new Error(`Failed to add job to pg-boss queue ${this.queueName}`);
            }
        } catch (error) {
            logger.error(`Error adding job to pg-boss queue ${this.queueName}: ${error.message}`, error);
            throw error;
        }
    }

    // createWorker is specific to BullMQ. For pg-boss, workers are created using boss.work()
    // We will need to adapt how workers are managed.
    // This method in BaseQueue creates a BullMQ worker. We need a pg-boss equivalent.
    public createWorker(concurrency: number = 1): any { // Type any for now
        logger.info(`Registering worker for pg-boss queue: ${this.queueName} with concurrency: ${concurrency}`);
        // The actual job processing logic is passed to boss.work()
        // The processJob method (which must be implemented by subclasses) will be our handler
        try {
            // pg-boss's work() method takes the queue name, options (like concurrency), and a handler function.
            // The handler function receives a pg-boss job object.
            this.boss.work(this.queueName, { newJobCheckInterval: 2000, teamSize: concurrency, teamConcurrency: concurrency }, async (job: PgBoss.Job<any>) => {
                const start = new Date().getTime();
                logger.info(`Processing job ${job.id} from pg-boss queue ${this.queueName} at ${new Date().toISOString()}`);
                try {
                    const result = await this.processJob(job.data); // Call the abstract method
                    const end = new Date().getTime();
                    logger.info(`Completed job ${job.id} in pg-boss queue ${this.queueName} at ${new Date().toISOString()} (${end - start}ms)`);
                    // Unlike BullMQ, you don't explicitly return the result to the worker complete handler.
                    // pg-boss jobs are marked complete by not throwing an error.
                    // If an error is thrown, pg-boss will handle retries based on its configuration.
                } catch (error) {
                    logger.error(`Error processing job ${job.id} in pg-boss queue ${this.queueName}: ${error.message}`, error);
                    // Re-throw the error so pg-boss can handle it (e.g., retry or move to a dead-letter queue)
                    throw error;
                }
            });
            logger.info(`Worker registered for pg-boss queue: ${this.queueName}`);
            // There isn't a direct "Worker" object to return like in BullMQ.
            // We could return null or a placeholder. For now, returning the boss instance.
            return this.boss;
        } catch (error) {
            logger.error(`Error creating worker for pg-boss queue ${this.queueName}: ${error.message}`, error);
            throw error;
        }
    }

    // The following methods are BullMQ specific and need pg-boss equivalents or stubs.

    public async getJobs(): Promise<Job[]> {
        logger.warn('getJobs() is not directly supported by pg-boss in the same way as BullMQ. Returning empty array.');
        // pg-boss does not have a direct equivalent to get all jobs in this format.
        // You can query the pgboss.job table directly if needed, but that's outside the scope of the library's API.
        return [];
    }

    public async getJobCounts(): Promise<{ [index: string]: number }> {
        logger.warn('getJobCounts() is not directly supported by pg-boss. Returning empty object.');
        // pg-boss doesn't provide aggregated job counts like BullMQ.
        // This would require custom SQL queries on the pgboss.job table.
        return {};
    }

    public async getJobByName(jobName: string): Promise<Job> {
        logger.warn(`getJobByName('${jobName}') is not directly supported by pg-boss. Throwing error.`);
        // pg-boss jobs are typically fetched by ID. Searching by a custom 'name' property would require custom logic.
        throw new Error('getJobByName is not supported by PgBossQueue');
    }

    // QueueEvents are a BullMQ feature for listening to queue-wide events.
    // pg-boss uses an EventEmitter interface for events like 'error', 'archived', 'deleted', etc.
    // We might need to adapt or remove this if it's heavily used.
    public getQueueEvents(): any { // Type any for now
        logger.warn('getQueueEvents() called on PgBossQueue. pg-boss uses an EventEmitter for error events. Returning pg-boss instance.');
        return this.boss; // The boss instance itself is an EventEmitter
    }

    public async clearQueue(): Promise<void> {
        logger.info(`Clearing pg-boss queue: ${this.queueName}`);
        try {
            // pg-boss offers methods to clear archived jobs or all jobs for a queue
            await this.boss.clearStorage(); // This clears all jobs, completed or not. Use with caution.
            // Or, more specifically for a single queue:
            // await this.boss.dangerouslyPurgeQueue(this.queueName); // Requires Flowise >= pg-boss v9
            // For older versions, you might need to manually delete from the pg_boss.job table.
            // Given pg-boss is at v9, dangerouslyPurgeQueue should be available.
            // Let's assume for now `clearStorage()` is what we want for a full clear,
            // or we might need to adjust based on desired behavior (e.g., only pending jobs).
            // The `obliterate` equivalent in pg-boss is `dangerouslyPurgeQueue`
            // However, `clearStorage` wipes everything. Let's use purge if available.
            // As of pg-boss 9.x, there is no direct `dangerouslyPurgeQueue`.
            // `clearStorage()` clears everything.
            // `archiveCompletedJobs(name)` and `purgeArchivedJobs(name)` are for completed jobs.
            // To clear all jobs for a specific queue, you might need to use SQL or a loop with fetch/remove.
            // For now, let's log a warning that this is a more complex operation.
            logger.warn(`clearQueue() for pg-boss queue ${this.queueName} is a complex operation. pg-boss does not have a direct one-shot command to clear all jobs for a specific queue like BullMQ's obliterate. clearStorage() clears all queues.`);
            // As a placeholder, we are not performing a specific queue clear yet.
            // This needs to be implemented carefully, possibly with direct SQL.
        } catch (error) {
            logger.error(`Error clearing pg-boss queue ${this.queueName}: ${error.message}`, error);
            throw error;
        }
    }
}
