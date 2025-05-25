import { DataSource, Repository } from 'typeorm'
import { Trigger } from '../../database/entities/Trigger'
import { TriggerEvent } from '../../database/entities/TriggerEvent'
import { ChatFlow } from '../../database/entities/ChatFlow'
import axios from 'axios'
import { ICommonObject } from '../../Interface'
import { getServerUrl } from '../../utils'

export class TriggerService {
    private triggerRepository: Repository<Trigger>
    private triggerEventRepository: Repository<TriggerEvent>
    private chatflowRepository: Repository<ChatFlow>

    constructor(private dataSource: DataSource) {
        this.triggerRepository = dataSource.getRepository(Trigger)
        this.triggerEventRepository = dataSource.getRepository(TriggerEvent)
        this.chatflowRepository = dataSource.getRepository(ChatFlow)
    }

    /**
     * Get all triggers
     */
    async getAllTriggers(tenantId?: string): Promise<Trigger[]> {
        const query = this.triggerRepository.createQueryBuilder('trigger')
            .leftJoinAndSelect('trigger.chatflow', 'chatflow')
        
        if (tenantId) {
            query.where('trigger.tenantId = :tenantId', { tenantId })
        }
        
        return await query.getMany()
    }

    /**
     * Get trigger by id
     */
    async getTriggerById(triggerId: string): Promise<Trigger | null> {
        return await this.triggerRepository.findOne({
            where: { id: triggerId },
            relations: ['chatflow']
        })
    }

    /**
     * Create a new trigger
     */
    async createTrigger(triggerData: Partial<Trigger>): Promise<Trigger> {
        const newTrigger = this.triggerRepository.create(triggerData)
        return await this.triggerRepository.save(newTrigger)
    }

    /**
     * Update a trigger
     */
    async updateTrigger(triggerId: string, triggerData: Partial<Trigger>): Promise<Trigger | null> {
        const trigger = await this.triggerRepository.findOneBy({ id: triggerId })
        if (!trigger) return null

        Object.assign(trigger, triggerData)
        return await this.triggerRepository.save(trigger)
    }

    /**
     * Delete a trigger
     */
    async deleteTrigger(triggerId: string): Promise<boolean> {
        const result = await this.triggerRepository.delete(triggerId)
        return result.affected ? result.affected > 0 : false
    }

    /**
     * Get trigger events
     */
    async getTriggerEvents(triggerId: string, limit = 10): Promise<TriggerEvent[]> {
        return await this.triggerEventRepository.find({
            where: { triggerId },
            order: { createdDate: 'DESC' },
            take: limit
        })
    }

    /**
     * Create a trigger event
     */
    async createTriggerEvent(eventData: Partial<TriggerEvent>): Promise<TriggerEvent> {
        const newEvent = this.triggerEventRepository.create(eventData)
        return await this.triggerEventRepository.save(newEvent)
    }

    /**
     * Execute a trigger
     */
    async executeTrigger(triggerId: string, payload: ICommonObject = {}): Promise<TriggerEvent> {
        const trigger = await this.getTriggerById(triggerId)
        if (!trigger) {
            throw new Error(`Trigger with ID ${triggerId} not found`)
        }

        if (!trigger.isActive) {
            throw new Error(`Trigger with ID ${triggerId} is not active`)
        }

        if (!trigger.chatflowId) {
            throw new Error(`Trigger with ID ${triggerId} has no associated chatflow`)
        }

        // Create a new trigger event
        const triggerEvent = await this.createTriggerEvent({
            triggerId,
            payload: JSON.stringify(payload),
            status: 'pending'
        })

        try {
            // Execute the chatflow
            const serverUrl = getServerUrl()
            const response = await axios.post(
                `${serverUrl}/api/v1/prediction/${trigger.chatflowId}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )

            // Update the trigger event with the result
            triggerEvent.status = 'completed'
            triggerEvent.result = JSON.stringify(response.data)
            await this.triggerEventRepository.save(triggerEvent)

            return triggerEvent
        } catch (error) {
            // Update the trigger event with the error
            triggerEvent.status = 'failed'
            triggerEvent.error = error.message || 'Unknown error'
            await this.triggerEventRepository.save(triggerEvent)

            throw error
        }
    }
}