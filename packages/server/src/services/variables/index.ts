import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable, VariableVisibility } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { IUser } from '../../Interface'
import { Any, FindOptionsWhere, IsNull, Like } from 'typeorm'

const createVariable = async (newVariable: Variable, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        newVariable.userId = user.id
        newVariable.organizationId = user.organizationId
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

const getAllVariables = async (user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const variableRepo = appServer.AppDataSource.getRepository(Variable)

        const isAdmin = user?.roles?.includes('Admin')

        let conditions: FindOptionsWhere<Variable> | FindOptionsWhere<Variable>[]

        if (isAdmin) {
            conditions = [{ organizationId: user.organizationId }, { userId: IsNull() }]
        } else {
            conditions = [
                { userId: user.id },
                { userId: IsNull() },
                {
                    organizationId: user.organizationId,
                    // @ts-ignore
                    visibility: Like(`%${VariableVisibility.ORGANIZATION}%`)
                }
            ]
        }

        const variables = await variableRepo.find({ where: conditions })

        // Deduplicate variables based on id
        const uniqueVariables = Array.from(new Map(variables.map((item) => [item.id, item])).values())

        // Add isOwner property
        return uniqueVariables.map((variable) => ({
            ...variable,
            isOwner: variable.userId === user.id
        }))
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
