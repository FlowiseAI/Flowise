import { DataSource, Repository } from 'typeorm'
import { IActionRequest } from '../../../components/src/Interface'
import { ActionRequest } from '../database/entities/ActionRequest'
import { AppDataSource } from '../DataSource'
import { ActionRequestNotFoundError, ActionRequestValidationError } from '../middlewares/errors'

export class ActionRequestService {
    private actionRequestRepository: Repository<ActionRequest>

    constructor() {
        this.actionRequestRepository = AppDataSource.getRepository(ActionRequest)
    }

    /**
     * Get all action requests for a flow
     */
    async getFlowActionRequests(flowId: string): Promise<IActionRequest[]> {
        return this.actionRequestRepository.find({
            where: { flow_id: flowId, deleted_at: null },
            order: { created_at: 'DESC' }
        })
    }

    /**
     * Get action request by ID
     */
    async getActionRequest(actionId: string): Promise<IActionRequest> {
        const actionRequest = await this.actionRequestRepository.findOne({
            where: { id: actionId, deleted_at: null }
        })

        if (!actionRequest) {
            throw new ActionRequestNotFoundError(actionId)
        }

        return actionRequest
    }

    /**
     * Update action request
     */
    async updateActionRequest(actionId: string, data: Partial<IActionRequest>): Promise<IActionRequest> {
        const actionRequest = await this.getActionRequest(actionId)

        if (data.status && !['completed', 'expired', 'cancelled'].includes(data.status)) {
            throw new ActionRequestValidationError('Invalid status')
        }

        await this.actionRequestRepository.update(
            { id: actionId, deleted_at: null },
            {
                ...data,
                updated_at: new Date()
            }
        )

        return this.getActionRequest(actionId)
    }

    /**
     * Get pending action requests for a session
     */
    async getSessionPendingRequests(sessionId: string): Promise<IActionRequest[]> {
        return this.actionRequestRepository.find({
            where: {
                session_id: sessionId,
                status: 'pending',
                deleted_at: null
            },
            order: { created_at: 'ASC' }
        })
    }

    /**
     * Create new action request
     */
    async createActionRequest(data: Omit<IActionRequest, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<IActionRequest> {
        if (!data.flow_id || !data.session_id || !data.node_id) {
            throw new ActionRequestValidationError('Missing required fields')
        }

        const actionRequest = this.actionRequestRepository.create({
            ...data,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
        })
        return this.actionRequestRepository.save(actionRequest)
    }

    /**
     * Soft delete action request
     */
    async deleteActionRequest(actionId: string): Promise<void> {
        const actionRequest = await this.getActionRequest(actionId)
        await this.actionRequestRepository.update(
            { id: actionId },
            { deleted_at: new Date() }
        )
    }
} 