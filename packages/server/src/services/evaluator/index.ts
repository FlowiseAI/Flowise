import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Evaluator } from '../../database/entities/Evaluator'
import { EvaluatorDTO } from '../../Interface.Evaluation'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'

const getAllEvaluators = async (workspaceId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const results: Evaluator[] = await appServer.AppDataSource.getRepository(Evaluator).findBy(getWorkspaceSearchOptions(workspaceId))
        return EvaluatorDTO.fromEntities(results)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: evaluatorService.getAllEvaluators - ${getErrorMessage(error)}`
        )
    }
}

const getEvaluator = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluator = await appServer.AppDataSource.getRepository(Evaluator).findOneBy({
            id: id
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
const updateEvaluator = async (id: string, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluator = await appServer.AppDataSource.getRepository(Evaluator).findOneBy({
            id: id
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
const deleteEvaluator = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(Evaluator).delete({ id: id })
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
