import { Request, Response } from 'express'
import { ActionRequestService } from '../services/ActionRequestService'
import { IActionRequest } from '../../../components/src/Interface'

export class ActionRequestController {
    private actionRequestService: ActionRequestService

    constructor() {
        this.actionRequestService = new ActionRequestService()
    }

    /**
     * Get all action requests for a flow
     */
    async getFlowActionRequests(req: Request, res: Response) {
        try {
            const flowId = req.params.flowId
            const actionRequests = await this.actionRequestService.getFlowActionRequests(flowId)
            return res.json(actionRequests)
        } catch (error) {
            console.error('Error getting flow action requests:', error)
            return res.status(500).json({ error: 'Failed to get action requests' })
        }
    }

    /**
     * Get action request by ID
     */
    async getActionRequest(req: Request, res: Response) {
        try {
            const actionId = req.params.actionId
            const actionRequest = await this.actionRequestService.getActionRequest(actionId)
            if (!actionRequest) {
                return res.status(404).json({ error: 'Action request not found' })
            }
            return res.json(actionRequest)
        } catch (error) {
            console.error('Error getting action request:', error)
            return res.status(500).json({ error: 'Failed to get action request' })
        }
    }

    /**
     * Update action request status and response
     */
    async updateActionRequest(req: Request, res: Response) {
        try {
            const actionId = req.params.actionId
            const { status, response } = req.body

            if (!status || !['completed', 'expired', 'cancelled'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' })
            }

            const actionRequest = await this.actionRequestService.updateActionRequest(actionId, {
                status,
                response,
                updated_at: new Date()
            })

            if (!actionRequest) {
                return res.status(404).json({ error: 'Action request not found' })
            }

            return res.json(actionRequest)
        } catch (error) {
            console.error('Error updating action request:', error)
            return res.status(500).json({ error: 'Failed to update action request' })
        }
    }

    /**
     * Get pending action requests for a session
     */
    async getSessionPendingRequests(req: Request, res: Response) {
        try {
            const sessionId = req.params.sessionId
            const actionRequests = await this.actionRequestService.getSessionPendingRequests(sessionId)
            return res.json(actionRequests)
        } catch (error) {
            console.error('Error getting session pending requests:', error)
            return res.status(500).json({ error: 'Failed to get pending requests' })
        }
    }
} 