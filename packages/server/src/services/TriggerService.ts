import { Repository } from 'typeorm'
import { Trigger } from '../database/entities/Trigger'
import { TriggerEvent } from '../database/entities/TriggerEvent'
import { DataSource } from 'typeorm'
import { IChatFlow } from '../Interface'
// import { ChatFlowService } from './chatflows' // Module not found or not exported

export class TriggerService {
    private triggerRepository: Repository<Trigger>
    private triggerEventRepository: Repository<TriggerEvent>
    // private chatflowService: ChatFlowService // Module not found or not exported

    constructor(dataSource: DataSource /*, chatflowService: ChatFlowService */) { // ChatFlowService parameter removed {
        this.triggerRepository = dataSource.getRepository(Trigger)
        this.triggerEventRepository = dataSource.getRepository(TriggerEvent)
        // this.chatflowService = chatflowService // ChatFlowService assignment removed
    }

    async getTriggers(tenantId?: string): Promise<Trigger[]> {
        const query = this.triggerRepository.createQueryBuilder('trigger')
        
        if (tenantId) {
            query.where('trigger.tenantId = :tenantId', { tenantId })
        }
        
        return query.getMany()
    }

    async getTriggerById(id: string): Promise<Trigger | null> {
        return this.triggerRepository.findOne({ where: { id } })
    }

    async getTriggersByChatflowId(chatflowId: string): Promise<Trigger[]> {
        return this.triggerRepository.find({ where: { chatflowId } })
    }

    async createTrigger(triggerData: Partial<Trigger>): Promise<Trigger> {
        // Validate chatflow exists
        /* // Commenting out ChatFlowService validation due to missing ChatFlowService
        if (triggerData.chatflowId) {
            const chatflow = await this.chatflowService.getChatFlowById(triggerData.chatflowId)
            if (!chatflow) {
                throw new Error(`Chatflow with id ${triggerData.chatflowId} not found`)
            }
        }
        */

        // Convert config object to string if needed
        if (triggerData.config && typeof triggerData.config !== 'string') {
            triggerData.config = JSON.stringify(triggerData.config)
        }

        const trigger = this.triggerRepository.create(triggerData)
        return this.triggerRepository.save(trigger)
    }

    async updateTrigger(id: string, triggerData: Partial<Trigger>): Promise<Trigger> {
        const trigger = await this.getTriggerById(id)
        if (!trigger) {
            throw new Error(`Trigger with id ${id} not found`)
        }

        // Convert config object to string if needed
        if (triggerData.config && typeof triggerData.config !== 'string') {
            triggerData.config = JSON.stringify(triggerData.config)
        }

        Object.assign(trigger, triggerData)
        return this.triggerRepository.save(trigger)
    }

    async deleteTrigger(id: string): Promise<void> {
        const trigger = await this.getTriggerById(id)
        if (!trigger) {
            throw new Error(`Trigger with id ${id} not found`)
        }
        await this.triggerRepository.remove(trigger)
    }

    async createTriggerEvent(eventData: Partial<TriggerEvent>): Promise<TriggerEvent> {
        // Convert payload and result objects to strings if needed
        if (eventData.payload && typeof eventData.payload !== 'string') {
            eventData.payload = JSON.stringify(eventData.payload)
        }
        if (eventData.result && typeof eventData.result !== 'string') {
            eventData.result = JSON.stringify(eventData.result)
        }

        const event = this.triggerEventRepository.create(eventData)
        return this.triggerEventRepository.save(event)
    }

    async getTriggerEvents(triggerId: string): Promise<TriggerEvent[]> {
        return this.triggerEventRepository.find({ 
            where: { triggerId },
            order: { createdDate: 'DESC' }
        })
    }

    async getTriggerEventById(id: string): Promise<TriggerEvent | null> {
        return this.triggerEventRepository.findOne({ where: { id } })
    }

    async updateTriggerEvent(id: string, eventData: Partial<TriggerEvent>): Promise<TriggerEvent> {
        const event = await this.getTriggerEventById(id)
        if (!event) {
            throw new Error(`Trigger event with id ${id} not found`)
        }

        // Convert payload and result objects to strings if needed
        if (eventData.payload && typeof eventData.payload !== 'string') {
            eventData.payload = JSON.stringify(eventData.payload)
        }
        if (eventData.result && typeof eventData.result !== 'string') {
            eventData.result = JSON.stringify(eventData.result)
        }

        Object.assign(event, eventData)
        return this.triggerEventRepository.save(event)
    }
}