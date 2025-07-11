import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { FlowVersionService } from '../services/flow-version.service'

export class FlowVersionController {
    public async publishFlow(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.params || !req.params.id) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            const message = req.body?.message
            if (!message) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'message not provided!')
            }
            const service = new FlowVersionService()
            const result = await service.publishFlow(req.params.id, message)
            if (result.success) {
                return res.status(StatusCodes.OK).json(result)
            } else {
                return res.status(StatusCodes.BAD_REQUEST).json(result)
            }
        } catch (error) {
            next(error)
        }
    }

    public async getVersions(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.params || !req.params.id || req.params.id === "undefined") {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            const service = new FlowVersionService()
            const result = await service.getVersions(req.params.id)
            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    public async makeDraft(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.params || !req.params.id || req.params.id === "undefined") {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'id not provided!')
            }
            if (!req.params || !req.params.commitId || req.params.commitId === "undefined") {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'commitId not provided!')
            }
            const service = new FlowVersionService()
            const result = await service.makeDraft(req.params.id, req.params.commitId)
            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }
} 