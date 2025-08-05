import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { EntityType } from '../../database/entities/FlowHistory'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import historyService from '../../services/history'

const validateEntityType = (entityType: string): EntityType => {
    const upperType = entityType.toUpperCase()
    if (!['CHATFLOW', 'ASSISTANT'].includes(upperType)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'entityType must be either CHATFLOW or ASSISTANT')
    }
    return upperType as EntityType
}

const getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { entityType, entityId } = req.params
        const { page = '1', limit = '20' } = req.query

        if (!entityType || !entityId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'entityType and entityId are required parameters')
        }

        const pageNum = Number(page)
        const limitNum = Number(limit)

        const result = await historyService.getHistory({
            entityType: validateEntityType(entityType),
            entityId,
            workspaceId: req.user?.activeWorkspaceId,
            limit: limitNum,
            offset: (pageNum - 1) * limitNum
        })

        return res.json(result)
    } catch (error) {
        next(error)
    }
}

const getSnapshotById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { historyId } = req.params
        if (!historyId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'historyId is required')
        }

        const snapshot = await historyService.getSnapshotById(historyId)
        return res.json(snapshot)
    } catch (error) {
        next(error)
    }
}

const restoreSnapshot = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { historyId } = req.params
        if (!historyId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'historyId is required')
        }

        const restoredEntity = await historyService.restoreSnapshot({
            historyId,
            workspaceId: req.user?.activeWorkspaceId
        })

        return res.json({
            message: 'Successfully restored from history snapshot',
            entity: restoredEntity
        })
    } catch (error) {
        next(error)
    }
}

const deleteSnapshot = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { historyId } = req.params
        if (!historyId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'historyId is required')
        }

        await historyService.deleteSnapshot(historyId, req.user?.activeWorkspaceId)
        return res.json({ message: 'History snapshot deleted successfully' })
    } catch (error) {
        next(error)
    }
}

const getSnapshotComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { historyId1, historyId2 } = req.params
        if (!historyId1 || !historyId2) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Both historyId1 and historyId2 are required')
        }

        const comparison = await historyService.getSnapshotComparison(historyId1, historyId2, req.user?.activeWorkspaceId)
        return res.json(comparison)
    } catch (error) {
        next(error)
    }
}

export default {
    getHistory,
    getSnapshotById,
    restoreSnapshot,
    deleteSnapshot,
    getSnapshotComparison
}
