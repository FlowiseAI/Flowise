import OpenAI from 'openai'
import path from 'path'
import * as fs from 'fs'
import { uniqWith, isEqual } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Assistant } from '../../database/entities/Assistant'
import { Credential } from '../../database/entities/Credential'
import { getUserHome, decryptCredentialData, getAppVersion } from '../../utils'

const creatAssistant = async (requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        if (!requestBody.details) {
            return {
                executionError: true,
                status: 500,
                msg: `Invalid request body`
            }
        }
        const assistantDetails = JSON.parse(requestBody.details)
        try {
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: requestBody.credential
            })

            if (!credential) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `Credential ${requestBody.credential} not found`
                }
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `OpenAI ApiKey not found`
                }
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

            if (assistantDetails.uploadFiles) {
                // Base64 strings
                let files: string[] = []
                const fileBase64 = assistantDetails.uploadFiles
                if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                    files = JSON.parse(fileBase64)
                } else {
                    files = [fileBase64]
                }

                const uploadedFiles = []
                for (const file of files) {
                    const splitDataURI = file.split(',')
                    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', filename)
                    if (!fs.existsSync(path.join(getUserHome(), '.flowise', 'openai-assistant'))) {
                        fs.mkdirSync(path.dirname(filePath), { recursive: true })
                    }
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, bf)
                    }

                    const createdFile = await openai.files.create({
                        file: fs.createReadStream(filePath),
                        purpose: 'assistants'
                    })
                    uploadedFiles.push(createdFile)

                    fs.unlinkSync(filePath)
                }
                assistantDetails.files = [...assistantDetails.files, ...uploadedFiles]
            }

            if (!assistantDetails.id) {
                const newAssistant = await openai.beta.assistants.create({
                    name: assistantDetails.name,
                    description: assistantDetails.description,
                    instructions: assistantDetails.instructions,
                    model: assistantDetails.model,
                    tools,
                    file_ids: (assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)
                })
                assistantDetails.id = newAssistant.id
            } else {
                const retrievedAssistant = await openai.beta.assistants.retrieve(assistantDetails.id)
                let filteredTools = uniqWith([...retrievedAssistant.tools, ...tools], isEqual)
                filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

                await openai.beta.assistants.update(assistantDetails.id, {
                    name: assistantDetails.name,
                    description: assistantDetails.description ?? '',
                    instructions: assistantDetails.instructions ?? '',
                    model: assistantDetails.model,
                    tools: filteredTools,
                    file_ids: uniqWith(
                        [...retrievedAssistant.file_ids, ...(assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)],
                        isEqual
                    )
                })
            }

            const newAssistantDetails = {
                ...assistantDetails
            }
            if (newAssistantDetails.uploadFiles) delete newAssistantDetails.uploadFiles

            requestBody.details = JSON.stringify(newAssistantDetails)
        } catch (error) {
            return {
                executionError: true,
                status: 500,
                msg: `Error creating new assistant: ${error}`
            }
        }
        const newAssistant = new Assistant()
        Object.assign(newAssistant, requestBody)

        const assistant = await appServer.AppDataSource.getRepository(Assistant).create(newAssistant)
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)

        await appServer.telemetry.sendTelemetry('assistant_created', {
            version: await getAppVersion(),
            assistantId: dbResponse.id
        })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: assistantsService.creatTool - ${error}`)
    }
}

const deleteAssistant = async (assistantId: string, isDeleteBoth: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
        })
        if (!assistant) {
            return {
                executionError: true,
                status: 404,
                msg: `Assistant ${assistantId} not found`
            }
        }
        try {
            const assistantDetails = JSON.parse(assistant.details)
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: assistant.credential
            })

            if (!credential) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `Credential ${assistant.credential} not found`
                }
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `OpenAI ApiKey not found`
                }
            }

            const openai = new OpenAI({ apiKey: openAIApiKey })
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).delete({ id: assistantId })
            if (isDeleteBoth) await openai.beta.assistants.del(assistantDetails.id)
            return dbResponse
        } catch (error: any) {
            if (error.status === 404 && error.type === 'invalid_request_error') {
                return 'OK'
            } else {
                return {
                    executionError: true,
                    status: 500,
                    msg: `Error deleting assistant: ${error}`
                }
            }
        }
    } catch (error) {
        throw new Error(`Error: assistantsService.deleteTool - ${error}`)
    }
}

const getAllAssistants = async (): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).find()
        return dbResponse
    } catch (error) {
        throw new Error(`Error: assistantsService.getAllAssistants - ${error}`)
    }
}

const getAssistantById = async (assistantId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
        })
        if (!dbResponse) {
            return {
                executionError: true,
                status: 404,
                msg: `Assistant ${assistantId} not found`
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: assistantsService.getAssistantById - ${error}`)
    }
}

const updateAssistant = async (assistantId: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
            id: assistantId
        })

        if (!assistant) {
            return {
                executionError: true,
                status: 404,
                msg: `Assistant ${assistantId} not found`
            }
        }
        try {
            const openAIAssistantId = JSON.parse(assistant.details)?.id
            const body = requestBody
            const assistantDetails = JSON.parse(body.details)
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: body.credential
            })

            if (!credential) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `Credential ${body.credential} not found`
                }
            }

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) {
                return {
                    executionError: true,
                    status: 404,
                    msg: `OpenAI ApiKey not found`
                }
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

            if (assistantDetails.uploadFiles) {
                // Base64 strings
                let files: string[] = []
                const fileBase64 = assistantDetails.uploadFiles
                if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                    files = JSON.parse(fileBase64)
                } else {
                    files = [fileBase64]
                }

                const uploadedFiles = []
                for (const file of files) {
                    const splitDataURI = file.split(',')
                    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', filename)
                    if (!fs.existsSync(path.join(getUserHome(), '.flowise', 'openai-assistant'))) {
                        fs.mkdirSync(path.dirname(filePath), { recursive: true })
                    }
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, bf)
                    }

                    const createdFile = await openai.files.create({
                        file: fs.createReadStream(filePath),
                        purpose: 'assistants'
                    })
                    uploadedFiles.push(createdFile)

                    fs.unlinkSync(filePath)
                }
                assistantDetails.files = [...assistantDetails.files, ...uploadedFiles]
            }

            const retrievedAssistant = await openai.beta.assistants.retrieve(openAIAssistantId)
            let filteredTools = uniqWith([...retrievedAssistant.tools, ...tools], isEqual)
            filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

            await openai.beta.assistants.update(openAIAssistantId, {
                name: assistantDetails.name,
                description: assistantDetails.description,
                instructions: assistantDetails.instructions,
                model: assistantDetails.model,
                tools: filteredTools,
                file_ids: uniqWith(
                    [...retrievedAssistant.file_ids, ...(assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)],
                    isEqual
                )
            })

            const newAssistantDetails = {
                ...assistantDetails,
                id: openAIAssistantId
            }
            if (newAssistantDetails.uploadFiles) delete newAssistantDetails.uploadFiles

            const updateAssistant = new Assistant()
            body.details = JSON.stringify(newAssistantDetails)
            Object.assign(updateAssistant, body)

            await appServer.AppDataSource.getRepository(Assistant).merge(assistant, updateAssistant)
            const dbResponse = await appServer.AppDataSource.getRepository(Assistant).save(assistant)
            return dbResponse
        } catch (error) {
            return {
                executionError: true,
                status: 500,
                msg: `Error updating assistant: ${error}`
            }
        }
    } catch (error) {
        throw new Error(`Error: assistantsService.updateAssistant - ${error}`)
    }
}

export default {
    creatAssistant,
    deleteAssistant,
    getAllAssistants,
    getAssistantById,
    updateAssistant
}
