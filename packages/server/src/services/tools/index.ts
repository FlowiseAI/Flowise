import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { validate } from 'uuid'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'
import { getAppVersion } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const createTool = async (requestBody: any, orgId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const newTool = new Tool()
        Object.assign(newTool, requestBody)
        const tool = await appServer.AppDataSource.getRepository(Tool).create(newTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        await appServer.telemetry.sendTelemetry(
            'tool_created',
            {
                version: await getAppVersion(),
                toolId: dbResponse.id,
                toolName: dbResponse.name
            },
            orgId
        )
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.TOOL_CREATED, { status: FLOWISE_COUNTER_STATUS.SUCCESS })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.createTool - ${getErrorMessage(error)}`)
    }
}

const deleteTool = async (toolId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).delete({
            id: toolId,
            workspaceId: workspaceId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.deleteTool - ${getErrorMessage(error)}`)
    }
}

const getAllTools = async (workspaceId?: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()
        const queryBuilder = appServer.AppDataSource.getRepository(Tool).createQueryBuilder('tool').orderBy('tool.updatedDate', 'DESC')

        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        if (workspaceId) queryBuilder.andWhere('tool.workspaceId = :workspaceId', { workspaceId })
        const [data, total] = await queryBuilder.getManyAndCount()

        if (page > 0 && limit > 0) {
            return { data, total }
        } else {
            return data
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getAllTools - ${getErrorMessage(error)}`)
    }
}

const getToolById = async (toolId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId,
            workspaceId: workspaceId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getToolById - ${getErrorMessage(error)}`)
    }
}

const updateTool = async (toolId: string, toolBody: any, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const tool = await appServer.AppDataSource.getRepository(Tool).findOneBy({
            id: toolId,
            workspaceId: workspaceId
        })
        if (!tool) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
        }
        const updateTool = new Tool()
        Object.assign(updateTool, toolBody)
        appServer.AppDataSource.getRepository(Tool).merge(tool, updateTool)
        const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.updateTool - ${getErrorMessage(error)}`)
    }
}

const importTools = async (newTools: Partial<Tool>[], queryRunner?: QueryRunner) => {
    try {
        for (const data of newTools) {
            if (data.id && !validate(data.id)) {
                throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: importTools - invalid id!`)
            }
        }

        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Tool) : appServer.AppDataSource.getRepository(Tool)

        // step 1 - check whether file tools array is zero
        if (newTools.length == 0) return

        // step 2 - check whether ids are duplicate in database
        let ids = '('
        let count: number = 0
        const lastCount = newTools.length - 1
        newTools.forEach((newTools) => {
            ids += `'${newTools.id}'`
            if (lastCount != count) ids += ','
            if (lastCount == count) ids += ')'
            count += 1
        })

        const selectResponse = await repository.createQueryBuilder('t').select('t.id').where(`t.id IN ${ids}`).getMany()
        const foundIds = selectResponse.map((response) => {
            return response.id
        })

        // step 3 - remove ids that are only duplicate
        const prepTools: Partial<Tool>[] = newTools.map((newTool) => {
            let id: string = ''
            if (newTool.id) id = newTool.id
            if (foundIds.includes(id)) {
                newTool.id = undefined
                newTool.name += ' (1)'
            }
            return newTool
        })

        // step 4 - transactional insert array of entities
        const insertResponse = await repository.insert(prepTools)

        return insertResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.importTools - ${getErrorMessage(error)}`)
    }
}

export default {
    createTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool,
    importTools
}
