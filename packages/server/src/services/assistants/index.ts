import { ICommonObject } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { cloneDeep, isEqual, uniqWith } from 'lodash'
import OpenAI from 'openai'
import { DeleteResult, In, QueryRunner } from 'typeorm'
import { Assistant } from '../../database/entities/Assistant'
import { Credential } from '../../database/entities/Credential'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { AssistantType } from '../../Interface'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'
import { databaseEntities, decryptCredentialData, getAppVersion } from '../../utils'
import { INPUT_PARAMS_TYPE } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { ASSISTANT_PROMPT_GENERATOR } from '../../utils/prompt'
import { checkUsageLimit } from '../../utils/quotaUsage'
import nodesService from '../nodes'

const createAssistant = async (requestBody: any, orgId: string): Promise<Assistant> => {
    try {
        const appServer = getRunningExpressApp()
        if (!requestBody.details) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Invalid request body`)
        }
        const assistantDetails = JSON.parse(requestBody.details)

        if (requestBody.type === 'CUSTOM') {
            const newAssistant = new Assistant()
            Object.assign(newAssistant, requestBody)

            const assistant = appServer.AppDataSource.getRepository(Assistant).create(newAssistant)
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)

            await appServer.telemetry.sendTelemetry(
                'assistant_created',
                {
                    version: await getAppVersion(),
                    assistantId: dbResponse.id
                },
                orgId
            )
            appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.ASSISTANT_CREATED, {
                status: FLOWISE_COUNTER_STATUS.SUCCESS
            })
            return dbResponse
        }

        try {
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: requestBody.credential
            })

            if (!credential) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${requestBody.credential} not found`)
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
            }
            const openai = new OpenAI({ apiKey: openAIApiKey })

            // Prepare tools
            let tools = []
            if (assistantDetails.tools) {
                for (const tool of assistantDetails.tools ?? []) {
                    tools.push({
                        type: tool
                    })
                }
            }

            // Save tool_resources to be stored later into database
            const savedToolResources = cloneDeep(assistantDetails.tool_resources)

            // Cleanup tool_resources for creating assistant
            if (assistantDetails.tool_resources) {
                for (const toolResource in assistantDetails.tool_resources) {
                    if (toolResource === 'file_search') {
                        assistantDetails.tool_resources['file_search'] = {
                            vector_store_ids: assistantDetails.tool_resources['file_search'].vector_store_ids
                        }
                    } else if (toolResource === 'code_interpreter') {
                        assistantDetails.tool_resources['code_interpreter'] = {
                            file_ids: assistantDetails.tool_resources['code_interpreter'].file_ids
                        }
                    }
                }
            }

            // If the assistant doesn't exist, create a new one
            if (!assistantDetails.id) {
                const newAssistant = await openai.beta.assistants.create({
                    name: assistantDetails.name,
                    description: assistantDetails.description,
                    instructions: assistantDetails.instructions,
                    model: assistantDetails.model,
                    tools,
                    tool_resources: assistantDetails.tool_resources,
                    temperature: assistantDetails.temperature,
                    top_p: assistantDetails.top_p
                })
                assistantDetails.id = newAssistant.id
            } else {
                const retrievedAssistant = await openai.beta.assistants.retrieve(assistantDetails.id)
                let filteredTools = uniqWith([...retrievedAssistant.tools.filter((tool) => tool.type === 'function'), ...tools], isEqual)
                // Remove empty functions
                filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

                await openai.beta.assistants.update(assistantDetails.id, {
                    name: assistantDetails.name,
                    description: assistantDetails.description ?? '',
                    instructions: assistantDetails.instructions ?? '',
                    model: assistantDetails.model,
                    tools: filteredTools,
                    tool_resources: assistantDetails.tool_resources,
                    temperature: assistantDetails.temperature,
                    top_p: assistantDetails.top_p
                })
            }

            const newAssistantDetails = {
                ...assistantDetails
            }
            if (savedToolResources) newAssistantDetails.tool_resources = savedToolResources

            requestBody.details = JSON.stringify(newAssistantDetails)
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error creating new assistant - ${getErrorMessage(error)}`)
        }
        const newAssistant = new Assistant()
        Object.assign(newAssistant, requestBody)

        const assistant = appServer.AppDataSource.getRepository(Assistant).create(newAssistant)
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)

        await appServer.telemetry.sendTelemetry(
            'assistant_created',
            {
                version: await getAppVersion(),
                assistantId: dbResponse.id
            },
            orgId
        )

        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.ASSISTANT_CREATED, { status: FLOWISE_COUNTER_STATUS.SUCCESS })

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.createAssistant - ${getErrorMessage(error)}`
        )
    }
}

const deleteAssistant = async (assistantId: string, isDeleteBoth: any, workspaceId: string): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId,
            workspaceId: workspaceId
        })
        if (!assistant) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${assistantId} not found`)
        }
        if (assistant.type === 'CUSTOM') {
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).delete({ id: assistantId })
            return dbResponse
        }
        try {
            const assistantDetails = JSON.parse(assistant.details)
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: assistant.credential
            })

            if (!credential) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${assistant.credential} not found`)
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
            }

            const openai = new OpenAI({ apiKey: openAIApiKey })
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).delete({ id: assistantId })
            if (isDeleteBoth) await openai.beta.assistants.del(assistantDetails.id)
            return dbResponse
        } catch (error: any) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error deleting assistant - ${getErrorMessage(error)}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.deleteAssistant - ${getErrorMessage(error)}`
        )
    }
}

async function getAssistantsCountByOrganization(type: AssistantType, organizationId: string): Promise<number> {
    try {
        const appServer = getRunningExpressApp()

        const workspaces = await appServer.AppDataSource.getRepository(Workspace).findBy({ organizationId })
        const workspaceIds = workspaces.map((workspace) => workspace.id)
        const assistantsCount = await appServer.AppDataSource.getRepository(Assistant).countBy({
            type,
            workspaceId: In(workspaceIds)
        })

        return assistantsCount
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAssistantsCountByOrganization - ${getErrorMessage(error)}`
        )
    }
}

const getAllAssistants = async (workspaceId: string, type?: AssistantType): Promise<Assistant[]> => {
    try {
        const appServer = getRunningExpressApp()
        if (type) {
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findBy({
                type,
                ...getWorkspaceSearchOptions(workspaceId)
            })
            return dbResponse
        }
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findBy(getWorkspaceSearchOptions(workspaceId))
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAllAssistants - ${getErrorMessage(error)}`
        )
    }
}

const getAllAssistantsCount = async (workspaceId: string, type?: AssistantType): Promise<number> => {
    try {
        const appServer = getRunningExpressApp()
        if (type) {
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).countBy({
                type,
                ...getWorkspaceSearchOptions(workspaceId)
            })
            return dbResponse
        }
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).countBy(getWorkspaceSearchOptions(workspaceId))
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAllAssistantsCount - ${getErrorMessage(error)}`
        )
    }
}

const getAssistantById = async (assistantId: string, workspaceId: string): Promise<Assistant> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId,
            workspaceId: workspaceId
        })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${assistantId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAssistantById - ${getErrorMessage(error)}`
        )
    }
}

const updateAssistant = async (assistantId: string, requestBody: any, workspaceId: string): Promise<Assistant> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId,
            workspaceId: workspaceId
        })

        if (!assistant) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${assistantId} not found`)
        }

        if (assistant.type === 'CUSTOM') {
            const body = requestBody
            const updateAssistant = new Assistant()
            Object.assign(updateAssistant, body)

            appServer.AppDataSource.getRepository(Assistant).merge(assistant, updateAssistant)
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)
            return dbResponse
        }

        try {
            const openAIAssistantId = JSON.parse(assistant.details)?.id
            const body = requestBody
            const assistantDetails = JSON.parse(body.details)
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: body.credential
            })

            if (!credential) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${body.credential} not found`)
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
            }

            const openai = new OpenAI({ apiKey: openAIApiKey })

            let tools = []
            if (assistantDetails.tools) {
                for (const tool of assistantDetails.tools ?? []) {
                    tools.push({
                        type: tool
                    })
                }
            }

            // Save tool_resources to be stored later into database
            const savedToolResources = cloneDeep(assistantDetails.tool_resources)

            // Cleanup tool_resources before updating
            if (assistantDetails.tool_resources) {
                for (const toolResource in assistantDetails.tool_resources) {
                    if (toolResource === 'file_search') {
                        assistantDetails.tool_resources['file_search'] = {
                            vector_store_ids: assistantDetails.tool_resources['file_search'].vector_store_ids
                        }
                    } else if (toolResource === 'code_interpreter') {
                        assistantDetails.tool_resources['code_interpreter'] = {
                            file_ids: assistantDetails.tool_resources['code_interpreter'].file_ids
                        }
                    }
                }
            }

            const retrievedAssistant = await openai.beta.assistants.retrieve(openAIAssistantId)
            let filteredTools = uniqWith([...retrievedAssistant.tools.filter((tool) => tool.type === 'function'), ...tools], isEqual)
            filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

            await openai.beta.assistants.update(openAIAssistantId, {
                name: assistantDetails.name,
                description: assistantDetails.description,
                instructions: assistantDetails.instructions,
                model: assistantDetails.model,
                tools: filteredTools,
                tool_resources: assistantDetails.tool_resources,
                temperature: assistantDetails.temperature,
                top_p: assistantDetails.top_p
            })

            const newAssistantDetails = {
                ...assistantDetails,
                id: openAIAssistantId
            }
            if (savedToolResources) newAssistantDetails.tool_resources = savedToolResources

            const updateAssistant = new Assistant()
            body.details = JSON.stringify(newAssistantDetails)
            Object.assign(updateAssistant, body)

            appServer.AppDataSource.getRepository(Assistant).merge(assistant, updateAssistant)
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)
            return dbResponse
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error updating assistant - ${getErrorMessage(error)}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.updateAssistant - ${getErrorMessage(error)}`
        )
    }
}

const importAssistants = async (
    newAssistants: Partial<Assistant>[],
    orgId: string,
    _: string,
    subscriptionId: string,
    queryRunner?: QueryRunner
): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Assistant) : appServer.AppDataSource.getRepository(Assistant)

        // step 1 - check whether array is zero
        if (newAssistants.length == 0) return

        await checkUsageLimit('flows', subscriptionId, appServer.usageCacheManager, newAssistants.length)

        // step 2 - check whether ids are duplicate in database
        let ids = '('
        let count: number = 0
        const lastCount = newAssistants.length - 1
        newAssistants.forEach((newAssistant) => {
            ids += `'${newAssistant.id}'`
            if (lastCount != count) ids += ','
            if (lastCount == count) ids += ')'
            count += 1
        })

        const selectResponse = await repository
            .createQueryBuilder('assistant')
            .select('assistant.id')
            .where(`assistant.id IN ${ids}`)
            .getMany()
        const foundIds = selectResponse.map((response) => {
            return response.id
        })

        // step 3 - remove ids that are only duplicate
        const prepVariables: Partial<Assistant>[] = newAssistants.map((newAssistant) => {
            let id: string = ''
            if (newAssistant.id) id = newAssistant.id
            if (foundIds.includes(id)) {
                newAssistant.id = undefined
            }
            return newAssistant
        })

        // step 4 - transactional insert array of entities
        const insertResponse = await repository.insert(prepVariables)

        return insertResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.importAssistants - ${getErrorMessage(error)}`
        )
    }
}

const getChatModels = async (): Promise<any> => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Chat Models')
        return dbResponse.filter((node) => !node.tags?.includes('LlamaIndex'))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getChatModels - ${getErrorMessage(error)}`
        )
    }
}

const getDocumentStores = async (activeWorkspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const stores = await appServer.AppDataSource.getRepository(DocumentStore).findBy(getWorkspaceSearchOptions(activeWorkspaceId))
        const returnData = []
        for (const store of stores) {
            if (store.status === 'UPSERTED') {
                const obj = {
                    name: store.id,
                    label: store.name,
                    description: store.description
                }
                returnData.push(obj)
            }
        }
        return returnData
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getDocumentStores - ${getErrorMessage(error)}`
        )
    }
}

const getTools = async (): Promise<any> => {
    try {
        const tools = await nodesService.getAllNodesForCategory('Tools')
        const mcpTools = await nodesService.getAllNodesForCategory('Tools (MCP)')

        // filter out those tools that input params type are not in the list
        const filteredTools = [...tools, ...mcpTools].filter((tool) => {
            const inputs = tool.inputs || []
            return inputs.every((input) => INPUT_PARAMS_TYPE.includes(input.type))
        })
        return filteredTools
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: assistantsService.getTools - ${getErrorMessage(error)}`)
    }
}

const generateAssistantInstruction = async (task: string, selectedChatModel: ICommonObject): Promise<ICommonObject> => {
    try {
        const appServer = getRunningExpressApp()

        if (selectedChatModel && Object.keys(selectedChatModel).length > 0) {
            const nodeInstanceFilePath = appServer.nodesPool.componentNodes[selectedChatModel.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newNodeInstance = new nodeModule.nodeClass()
            const nodeData = {
                credential: selectedChatModel.credential || selectedChatModel.inputs['FLOWISE_CREDENTIAL_ID'] || undefined,
                inputs: selectedChatModel.inputs,
                id: `${selectedChatModel.name}_0`
            }
            const options: ICommonObject = {
                appDataSource: appServer.AppDataSource,
                databaseEntities,
                logger
            }
            const llmNodeInstance = await newNodeInstance.init(nodeData, '', options)
            const response = await llmNodeInstance.invoke([
                {
                    role: 'user',
                    content: ASSISTANT_PROMPT_GENERATOR.replace('{{task}}', task)
                }
            ])
            const content = response?.content || response.kwargs?.content

            return { content }
        }

        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.generateAssistantInstruction - Error generating tool description`
        )
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.generateAssistantInstruction - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createAssistant,
    deleteAssistant,
    getAllAssistants,
    getAllAssistantsCount,
    getAssistantById,
    updateAssistant,
    importAssistants,
    getChatModels,
    getDocumentStores,
    getTools,
    generateAssistantInstruction,
    getAssistantsCountByOrganization
}
