import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const createVariable = async (newVariable: Variable) => {
    try {
        const appServer = getRunningExpressApp()
        const variable = await appServer.AppDataSource.getRepository(Variable).create(newVariable)
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).save(variable)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.createVariable - ${getErrorMessage(error)}`
        )
    }
}

const deleteVariable = async (variableId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).delete({ id: variableId })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.deleteVariable - ${getErrorMessage(error)}`
        )
    }
}

const getAllVariables = async () => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).find()
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.getAllVariables - ${getErrorMessage(error)}`
        )
    }
}

const getVariableById = async (variableId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).findOneBy({
            id: variableId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.getVariableById - ${getErrorMessage(error)}`
        )
    }
}

const updateVariable = async (variable: Variable, updatedVariable: Variable) => {
    try {
        const appServer = getRunningExpressApp()
        const tmpUpdatedVariable = await appServer.AppDataSource.getRepository(Variable).merge(variable, updatedVariable)
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).save(tmpUpdatedVariable)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.updateVariable - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createVariable,
    deleteVariable,
    getAllVariables,
    getVariableById,
    updateVariable
}
