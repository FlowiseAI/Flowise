import { StatusCodes } from 'http-status-codes'
import { Tool } from '../../database/entities/Tool'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getAppVersion } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { FLOWISE_METRIC_COUNTERS, FLOWISE_COUNTER_STATUS } from '../../Interface.Metrics'
import { QueryRunner } from 'typeorm'
import { User, UserRole } from '../../database/entities/User'

const createTool = async (req?: any): Promise<any> => {
  try {
    const { user, body } = req
    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const appServer = getRunningExpressApp()
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const newTool = new Tool()
    Object.assign(newTool, body)
    const tool = appServer.AppDataSource.getRepository(Tool).create({ ...newTool, userId: foundUser.id })
    const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
    await appServer.telemetry.sendTelemetry('tool_created', {
      version: await getAppVersion(),
      toolId: dbResponse.id,
      toolName: dbResponse.name
    })
    appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.TOOL_CREATED, { status: FLOWISE_COUNTER_STATUS.SUCCESS })
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.createTool - ${getErrorMessage(error)}`)
  }
}

const deleteTool = async (toolId: string): Promise<any> => {
  try {
    const appServer = getRunningExpressApp()
    const dbResponse = await appServer.AppDataSource.getRepository(Tool).delete({
      id: toolId
    })
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.deleteTool - ${getErrorMessage(error)}`)
  }
}

const getAllTools = async (req?: any): Promise<Tool[]> => {
  try {
    const appServer = getRunningExpressApp()
    const toolRepository = appServer.AppDataSource.getRepository(Tool)

    // If no request object, return all tools
    if (!req) {
      return await toolRepository.find()
    }

    const { user } = req
    if (!user?.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: User not found or unauthorized')
    }
    // Check user exists and get role in single query
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })

    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: User not found')
    }

    return await toolRepository.findBy({ userId: foundUser.id })
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getAllTools - ${getErrorMessage(error)}`)
  }
}

const getToolById = async (req: any): Promise<any> => {
  try {
    const { user } = req
    const toolId = req.params.id
    const appServer = getRunningExpressApp()

    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    let dbResponse
    if (foundUser.role !== UserRole.ADMIN) {
      dbResponse = await appServer.AppDataSource.getRepository(Tool).findOneBy({
        id: toolId,
        userId: user.id
      })
    } else {
      dbResponse = await appServer.AppDataSource.getRepository(Tool).findOneBy({
        id: toolId
      })
    }
    if (!dbResponse) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
    }
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.getToolById - ${getErrorMessage(error)}`)
  }
}

const updateTool = async (toolId: string, toolBody: any): Promise<any> => {
  try {
    const appServer = getRunningExpressApp()
    const tool = await appServer.AppDataSource.getRepository(Tool).findOneBy({
      id: toolId
    })
    if (!tool) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Tool ${toolId} not found`)
    }
    const updateTool = new Tool()
    Object.assign(updateTool, toolBody)
    await appServer.AppDataSource.getRepository(Tool).merge(tool, updateTool)
    const dbResponse = await appServer.AppDataSource.getRepository(Tool).save(tool)
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: toolsService.updateTool - ${getErrorMessage(error)}`)
  }
}

const importTools = async (newTools: Partial<Tool>[], queryRunner?: QueryRunner) => {
  try {
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
