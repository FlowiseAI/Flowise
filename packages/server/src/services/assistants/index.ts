import OpenAI from 'openai'
import { StatusCodes } from 'http-status-codes'
import { uniqWith, isEqual, cloneDeep } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Assistant } from '../../database/entities/Assistant'
import { Credential } from '../../database/entities/Credential'
import { decryptCredentialData, getAppVersion } from '../../utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const createAssistant = async (requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        if (!requestBody.details) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Invalid request body`)
        }
        const assistantDetails = JSON.parse(requestBody.details)
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
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.createAssistant - ${getErrorMessage(error)}`
        )
    }
}

const deleteAssistant = async (assistantId: string, isDeleteBoth: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
        })
        if (!assistant) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${assistantId} not found`)
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
            if (error.status === 404 && error.type === 'invalid_request_error') {
                return 'OK'
            } else {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error deleting assistant - ${getErrorMessage(error)}`)
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.deleteAssistant - ${getErrorMessage(error)}`
        )
    }
}

const getAllAssistants = async (): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).find()
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.getAllAssistants - ${getErrorMessage(error)}`
        )
    }
}

const getAssistantById = async (assistantId: string): Promise<any> => {
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

const updateAssistant = async (assistantId: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
        })

        if (!assistant) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Assistant ${assistantId} not found`)
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

export default {
    createAssistant,
    deleteAssistant,
    getAllAssistants,
    getAssistantById,
    updateAssistant
}
