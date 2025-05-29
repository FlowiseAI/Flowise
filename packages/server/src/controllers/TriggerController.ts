import { Request, Response } from 'express'
import { getDataSource } from '../DataSource'
import { TriggerService } from '../services/triggers/TriggerService'
import { triggerSchedulerService } from '../services/triggers/TriggerSchedulerService'
import { Trigger } from '../database/entities/Trigger'
import { ICommonObject } from '../Interface'

export const getAllTriggers = async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenantId as string
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const triggers = await triggerService.getAllTriggers(tenantId)
        return res.json(triggers)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const getTriggerById = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const trigger = await triggerService.getTriggerById(triggerId)
        if (!trigger) {
            return res.status(404).send({ error: `Trigger with ID ${triggerId} not found` })
        }
        return res.json(trigger)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const createTrigger = async (req: Request, res: Response) => {
    try {
        const triggerData: Partial<Trigger> = req.body
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const newTrigger = await triggerService.createTrigger(triggerData)
        
        // Schedule the trigger if it's active
        if (newTrigger.isActive) {
            await triggerSchedulerService.refreshTrigger(newTrigger.id)
        }
        
        return res.status(201).json(newTrigger)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const updateTrigger = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        const triggerData: Partial<Trigger> = req.body
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const updatedTrigger = await triggerService.updateTrigger(triggerId, triggerData)
        if (!updatedTrigger) {
            return res.status(404).send({ error: `Trigger with ID ${triggerId} not found` })
        }
        
        // Refresh the trigger schedule
        await triggerSchedulerService.refreshTrigger(triggerId)
        
        return res.json(updatedTrigger)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const deleteTrigger = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        
        // Stop any scheduled jobs for this trigger
        triggerSchedulerService.stopAndRemoveJob(triggerId);
        
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const success = await triggerService.deleteTrigger(triggerId)
        if (!success) {
            return res.status(404).send({ error: `Trigger with ID ${triggerId} not found` })
        }
        return res.status(204).send()
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const getTriggerEvents = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const events = await triggerService.getTriggerEvents(triggerId, limit)
        return res.json(events)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const executeTrigger = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        const payload: ICommonObject = req.body
        const dataSource = await getDataSource()
        const triggerService = new TriggerService(dataSource)
        const event = await triggerService.executeTrigger(triggerId, payload)
        return res.json(event)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const triggerId = req.params.id
        const payload: ICommonObject = req.body || {}
        
        const result = await triggerSchedulerService.handleWebhookTrigger(triggerId, payload)
        return res.json(result)
    } catch (error: any) {
        return res.status(500).send({ error: error.message })
    }
}