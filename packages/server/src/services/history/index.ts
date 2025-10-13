import { StatusCodes } from 'http-status-codes'
import { FindOptionsWhere, Repository } from 'typeorm'
import { FlowHistory, EntityType } from '../../database/entities/FlowHistory'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Assistant } from '../../database/entities/Assistant'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'

const updateEntityVersion = async (appServer: any, entityType: EntityType, entityId: string, version: number): Promise<void> => {
    if (entityType === 'CHATFLOW') {
        const chatflowRepository = appServer.AppDataSource.getRepository(ChatFlow)
        await chatflowRepository.update(entityId, { currentHistoryVersion: version })
    } else if (entityType === 'ASSISTANT') {
        const assistantRepository = appServer.AppDataSource.getRepository(Assistant)
        await assistantRepository.update(entityId, { currentHistoryVersion: version })
    }
}

const cleanEntityData = (data: any) => {
    const { updatedDate: _updatedDate, createdDate: _createdDate, currentHistoryVersion: _currentHistoryVersion, ...cleanData } = data
    return cleanData
}

const hasEntityDataChanged = async (
    entityType: EntityType,
    entityId: string,
    newEntityData: any,
    historyRepository: Repository<FlowHistory>
): Promise<boolean> => {
    try {
        const lastSnapshot = await historyRepository.findOne({
            where: { entityType, entityId },
            order: { version: 'DESC' }
        })

        if (!lastSnapshot) return true

        const lastData = cleanEntityData(JSON.parse(lastSnapshot.snapshotData))
        const newData = cleanEntityData(JSON.parse(JSON.stringify(newEntityData)))

        const hasChanged = JSON.stringify(lastData) !== JSON.stringify(newData)
        logger.debug(`Data comparison for ${entityType} ${entityId}: ${hasChanged ? 'changed' : 'no changes'}`)
        return hasChanged
    } catch (error) {
        logger.warn(`Failed to compare entity data for ${entityType} ${entityId}: ${getErrorMessage(error)}`)
        return true
    }
}

interface CreateSnapshotOptions {
    entityType: EntityType
    entityId: string
    entityData: any
    changeDescription?: string
    workspaceId?: string
}

interface GetHistoryOptions {
    entityType: EntityType
    entityId: string
    workspaceId?: string
    limit?: number
    offset?: number
}

interface RestoreSnapshotOptions {
    historyId: string
    workspaceId?: string
}

const createSnapshot = async ({
    entityType,
    entityId,
    entityData,
    changeDescription,
    workspaceId
}: CreateSnapshotOptions): Promise<FlowHistory | null> => {
    try {
        const appServer = getRunningExpressApp()
        const historyRepository = appServer.AppDataSource.getRepository(FlowHistory)

        const dataHasChanged = await hasEntityDataChanged(entityType, entityId, entityData, historyRepository)
        if (!dataHasChanged) {
            logger.debug(`No changes detected for ${entityType} ${entityId}, skipping snapshot creation`)
            return null
        }

        const lastSnapshot = await historyRepository.findOne({
            where: { entityType, entityId },
            order: { version: 'DESC' }
        })

        const nextVersion = lastSnapshot ? lastSnapshot.version + 1 : 1

        const snapshot = historyRepository.create({
            entityType,
            entityId,
            snapshotData: JSON.stringify(entityData),
            changeDescription,
            version: nextVersion,
            workspaceId
        })

        const savedSnapshot = await historyRepository.save(snapshot)
        await updateEntityVersion(appServer, entityType, entityId, nextVersion)

        logger.info(`Created history snapshot for ${entityType} ${entityId}, version ${nextVersion}`)
        await cleanupOldSnapshots(entityType, entityId, 50)

        return savedSnapshot
    } catch (error) {
        logger.error(`Failed to create history snapshot for ${entityType} ${entityId}: ${getErrorMessage(error)}`)
        return null
    }
}

const getHistory = async ({
    entityType,
    entityId,
    workspaceId,
    limit = 20,
    offset = 0
}: GetHistoryOptions): Promise<{ data: FlowHistory[]; total: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const historyRepository = appServer.AppDataSource.getRepository(FlowHistory)

        const whereConditions: FindOptionsWhere<FlowHistory> = { entityType, entityId }
        if (workspaceId) whereConditions.workspaceId = workspaceId

        const [data, total] = await historyRepository.findAndCount({
            where: whereConditions,
            order: { version: 'DESC' },
            take: limit,
            skip: offset
        })

        return { data, total }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: historyService.getHistory - ${getErrorMessage(error)}`)
    }
}

const getSnapshotById = async (historyId: string, workspaceId?: string): Promise<FlowHistory> => {
    try {
        const appServer = getRunningExpressApp()
        const historyRepository = appServer.AppDataSource.getRepository(FlowHistory)

        const whereConditions: FindOptionsWhere<FlowHistory> = { id: historyId }
        if (workspaceId) whereConditions.workspaceId = workspaceId

        const snapshot = await historyRepository.findOne({ where: whereConditions })
        if (!snapshot) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `History snapshot ${historyId} not found`)
        }

        return snapshot
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: historyService.getSnapshotById - ${getErrorMessage(error)}`
        )
    }
}

const restoreChatflow = async (appServer: any, snapshot: FlowHistory, snapshotData: any): Promise<any> => {
    const chatflowRepository = appServer.AppDataSource.getRepository(ChatFlow)
    const existing = await chatflowRepository.findOne({ where: { id: snapshot.entityId } })

    if (!existing) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ChatFlow ${snapshot.entityId} not found`)
    }

    const updated = chatflowRepository.merge(existing, {
        ...snapshotData,
        currentHistoryVersion: snapshot.version
    })

    return await chatflowRepository.save(updated)
}

const restoreAssistant = async (appServer: any, snapshot: FlowHistory, snapshotData: any): Promise<any> => {
    const assistantRepository = appServer.AppDataSource.getRepository(Assistant)
    const existing = await assistantRepository.findOne({ where: { id: snapshot.entityId } })

    if (!existing) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${snapshot.entityId} not found`)
    }

    const updated = assistantRepository.merge(existing, {
        details: snapshotData.details,
        credential: snapshotData.credential,
        iconSrc: snapshotData.iconSrc,
        type: snapshotData.type
    })

    return await assistantRepository.save(updated)
}

const restoreSnapshot = async ({ historyId, workspaceId }: RestoreSnapshotOptions): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const snapshot = await getSnapshotById(historyId, workspaceId)
        const snapshotData = JSON.parse(snapshot.snapshotData)

        const restoredEntity =
            snapshot.entityType === 'CHATFLOW'
                ? await restoreChatflow(appServer, snapshot, snapshotData)
                : await restoreAssistant(appServer, snapshot, snapshotData)

        await createSnapshot({
            entityType: snapshot.entityType,
            entityId: snapshot.entityId,
            entityData: restoredEntity,
            changeDescription: `Restored from version ${snapshot.version}`,
            workspaceId
        })

        logger.info(`Restored ${snapshot.entityType} ${snapshot.entityId} from version ${snapshot.version}`)
        return restoredEntity
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: historyService.restoreSnapshot - ${getErrorMessage(error)}`
        )
    }
}

const deleteSnapshot = async (historyId: string, workspaceId?: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()
        const historyRepository = appServer.AppDataSource.getRepository(FlowHistory)

        const whereConditions: FindOptionsWhere<FlowHistory> = { id: historyId }
        if (workspaceId) whereConditions.workspaceId = workspaceId

        const result = await historyRepository.delete(whereConditions)
        if (result.affected === 0) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `History snapshot ${historyId} not found`)
        }

        logger.info(`Deleted history snapshot ${historyId}`)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: historyService.deleteSnapshot - ${getErrorMessage(error)}`
        )
    }
}

const cleanupOldSnapshots = async (entityType: EntityType, entityId: string, keepCount: number = 50): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()
        const historyRepository = appServer.AppDataSource.getRepository(FlowHistory)

        const allSnapshots = await historyRepository.find({
            where: { entityType, entityId },
            order: { version: 'DESC' }
        })

        if (allSnapshots.length > keepCount) {
            const idsToDelete = allSnapshots.slice(keepCount).map((s) => s.id)
            await historyRepository.delete(idsToDelete)
            logger.info(`Cleaned up ${idsToDelete.length} old snapshots for ${entityType} ${entityId}`)
        }
    } catch (error) {
        logger.error(`Error cleaning up old snapshots: ${getErrorMessage(error)}`)
    }
}

const getSnapshotComparison = async (
    historyId1: string,
    historyId2: string,
    workspaceId?: string
): Promise<{ snapshot1: FlowHistory; snapshot2: FlowHistory }> => {
    try {
        const [snapshot1, snapshot2] = await Promise.all([
            getSnapshotById(historyId1, workspaceId),
            getSnapshotById(historyId2, workspaceId)
        ])

        if (snapshot1.entityType !== snapshot2.entityType || snapshot1.entityId !== snapshot2.entityId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cannot compare snapshots from different entities')
        }

        return { snapshot1, snapshot2 }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: historyService.getSnapshotComparison - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createSnapshot,
    getHistory,
    getSnapshotById,
    restoreSnapshot,
    deleteSnapshot,
    cleanupOldSnapshots,
    getSnapshotComparison
}
