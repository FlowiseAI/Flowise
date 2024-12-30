import OpenAI from 'openai'
import { StatusCodes } from 'http-status-codes'
import { uniqWith, isEqual, cloneDeep } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Assistant } from '../../database/entities/Assistant'
import { Credential } from '../../database/entities/Credential'
import { databaseEntities, decryptCredentialData, getAppVersion } from '../../utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { DeleteResult, QueryRunner } from 'typeorm'
import { FLOWISE_METRIC_COUNTERS, FLOWISE_COUNTER_STATUS } from '../../Interface.Metrics'
import { AssistantType } from '../../Interface'
import nodesService from '../nodes'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { ICommonObject } from 'flowise-components'
import logger from '../../utils/logger'
import { ASSISTANT_PROMPT_GENERATOR } from '../../utils/prompt'

const createAssistant = async (requestBody: any): Promise<Assistant> => {
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

            await appServer.telemetry.sendTelemetry('assistant_created', {
                version: await getAppVersion(),
                assistantId: dbResponse.id
            })
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

        await appServer.telemetry.sendTelemetry('assistant_created', {
            version: await getAppVersion(),
            assistantId: dbResponse.id
        })
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.ASSISTANT_CREATED, { status: FLOWISE_COUNTER_STATUS.SUCCESS })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.createAssistant - ${getErrorMessage(error)}`
        )
    }
}

const deleteAssistant = async (assistantId: string, isDeleteBoth: any): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
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

const getAllAssistants = async (type?: AssistantType): Promise<Assistant[]> => {
    try {
        const appServer = getRunningExpressApp()
        if (type) {
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findBy({
                type
            })
            return dbResponse
        }
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).find()
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAllAssistants - ${getErrorMessage(error)}`
        )
    }
}

const getAssistantById = async (assistantId: string): Promise<Assistant> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
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

const updateAssistant = async (assistantId: string, requestBody: any): Promise<Assistant> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
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

const importAssistants = async (newAssistants: Partial<Assistant>[], queryRunner?: QueryRunner): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Assistant) : appServer.AppDataSource.getRepository(Assistant)

        // step 1 - check whether array is zero
        if (newAssistants.length == 0) return

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

const getDocumentStores = async (): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const stores = await appServer.AppDataSource.getRepository(DocumentStore).find()
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
        const whitelistTypes = [
            'asyncOptions',
            'options',
            'multiOptions',
            'datagrid',
            'string',
            'number',
            'boolean',
            'password',
            'json',
            'code',
            'date',
            'file',
            'folder',
            'tabs'
        ]
        // filter out those tools that input params type are not in the list
        const filteredTools = tools.filter((tool) => {
            const inputs = tool.inputs || []
            return inputs.every((input) => whitelistTypes.includes(input.type))
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
    getAssistantById,
    updateAssistant,
    importAssistants,
    getChatModels,
    getDocumentStores,
    getTools,
    generateAssistantInstruction
}
