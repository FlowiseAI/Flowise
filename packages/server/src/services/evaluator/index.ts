import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Evaluator } from '../../database/entities/Evaluator'
import { EvaluatorDTO } from '../../Interface.Evaluation'

const getAllEvaluators = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(Evaluator).createQueryBuilder('ev').orderBy('ev.updatedDate', 'DESC')
        queryBuilder.andWhere('ev.workspaceId = :workspaceId', { workspaceId })
        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        const [data, total] = await queryBuilder.getManyAndCount()
        if (page > 0 && limit > 0) {
            return {
                total,
                data: EvaluatorDTO.fromEntities(data)
            }
        } else {
            return EvaluatorDTO.fromEntities(data)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.getAllEvaluators - ${getErrorMessage(error)}`
        )
    }
}

const getEvaluator = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluator = await appServer.AppDataSource.getRepository(Evaluator).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!evaluator) throw new Error(`Evaluator ${id} not found`)
        return EvaluatorDTO.fromEntity(evaluator)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.getEvaluator - ${getErrorMessage(error)}`
        )
    }
}

// Create new Evaluator
const createEvaluator = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const newDs = EvaluatorDTO.toEntity(body)

        const evaluator = appServer.AppDataSource.getRepository(Evaluator).create(newDs)
        const result = await appServer.AppDataSource.getRepository(Evaluator).save(evaluator)
        return EvaluatorDTO.fromEntity(result)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.createEvaluator - ${getErrorMessage(error)}`
        )
    }
}

// Update Evaluator
const updateEvaluator = async (id: string, body: any, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluator = await appServer.AppDataSource.getRepository(Evaluator).findOneBy({
            id: id,
            workspaceId: workspaceId
        })

        if (!evaluator) throw new Error(`Evaluator ${id} not found`)

        const updateEvaluator = EvaluatorDTO.toEntity(body)
        updateEvaluator.id = id
        appServer.AppDataSource.getRepository(Evaluator).merge(evaluator, updateEvaluator)
        const result = await appServer.AppDataSource.getRepository(Evaluator).save(evaluator)
        return EvaluatorDTO.fromEntity(result)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.updateEvaluator - ${getErrorMessage(error)}`
        )
    }
}

// Delete Evaluator via id
const deleteEvaluator = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(Evaluator).delete({ id: id, workspaceId: workspaceId })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.deleteEvaluator - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllEvaluators,
    getEvaluator,
    createEvaluator,
    updateEvaluator,
    deleteEvaluator
}
