import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getAppVersion } from '../../utils'
import { QueryRunner } from 'typeorm'
import { validate } from 'uuid'
import { Platform } from '../../Interface'

const createVariable = async (newVariable: Variable, orgId: string) => {
    const appServer = getRunningExpressApp()
    if (appServer.identityManager.getPlatformType() === Platform.CLOUD && newVariable.type === 'runtime')
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cloud platform does not support runtime variables!')
    try {
        const variable = await appServer.AppDataSource.getRepository(Variable).create(newVariable)
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).save(variable)
        await appServer.telemetry.sendTelemetry(
            'variable_created',
            {
                version: await getAppVersion(),
                variableType: variable.type
            },
            orgId
        )
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.createVariable - ${getErrorMessage(error)}`
        )
    }
}

const deleteVariable = async (variableId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).delete({ id: variableId, workspaceId: workspaceId })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.deleteVariable - ${getErrorMessage(error)}`
        )
    }
}

const getAllVariables = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(Variable)
            .createQueryBuilder('variable')
            .orderBy('variable.updatedDate', 'DESC')

        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        if (workspaceId) queryBuilder.andWhere('variable.workspaceId = :workspaceId', { workspaceId })

        if (appServer.identityManager.getPlatformType() === Platform.CLOUD) {
            queryBuilder.andWhere('variable.type != :type', { type: 'runtime' })
        }

        const [data, total] = await queryBuilder.getManyAndCount()

        if (page > 0 && limit > 0) {
            return { data, total }
        } else {
            return data
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.getAllVariables - ${getErrorMessage(error)}`
        )
    }
}

const getVariableById = async (variableId: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Variable).findOneBy({
            id: variableId,
            workspaceId: workspaceId
        })

        if (appServer.identityManager.getPlatformType() === Platform.CLOUD && dbResponse?.type === 'runtime') {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Cloud platform does not support runtime variables!')
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.getVariableById - ${getErrorMessage(error)}`
        )
    }
}

const updateVariable = async (variable: Variable, updatedVariable: Variable) => {
    const appServer = getRunningExpressApp()
    if (appServer.identityManager.getPlatformType() === Platform.CLOUD && updatedVariable.type === 'runtime')
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cloud platform does not support runtime variables!')
    try {
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

const importVariables = async (newVariables: Partial<Variable>[], queryRunner?: QueryRunner): Promise<any> => {
    try {
        for (const data of newVariables) {
            if (data.id && !validate(data.id)) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: importVariables - invalid id!`)
            }
        }

        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Variable) : appServer.AppDataSource.getRepository(Variable)

        // step 1 - check whether array is zero
        if (newVariables.length == 0) return

        // step 2 - check whether ids are duplicate in database
        let ids = '('
        let count: number = 0
        const lastCount = newVariables.length - 1
        newVariables.forEach((newVariable) => {
            ids += `'${newVariable.id}'`
            if (lastCount != count) ids += ','
            if (lastCount == count) ids += ')'
            count += 1
        })

        const selectResponse = await repository.createQueryBuilder('v').select('v.id').where(`v.id IN ${ids}`).getMany()
        const foundIds = selectResponse.map((response) => {
            return response.id
        })

        // step 3 - remove ids that are only duplicate
        let prepVariables: Partial<Variable>[] = newVariables.map((newVariable) => {
            let id: string = ''
            if (newVariable.id) id = newVariable.id
            if (foundIds.includes(id)) {
                newVariable.id = undefined
                newVariable.name += ' (1)'
            }
            return newVariable
        })

        // Filter out variables with type "runtime"
        if (appServer.identityManager.getPlatformType() === Platform.CLOUD)
            prepVariables = prepVariables.filter((variable) => variable.type !== 'runtime')

        // step 4 - transactional insert array of entities
        const insertResponse = await repository.insert(prepVariables)

        return insertResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variableService.importVariables - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createVariable,
    deleteVariable,
    getAllVariables,
    getVariableById,
    updateVariable,
    importVariables
}
