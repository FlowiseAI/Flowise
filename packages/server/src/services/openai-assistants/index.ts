import OpenAI from 'openai'
import { decryptCredentialData } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'

// ----------------------------------------
// Assistants
// ----------------------------------------

// List available assistants
const getAllOpenaiAssistants = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            return {
                executionError: true,
                status: 404,
                msg: `Credential ${credentialId} not found in the database!`
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
        const retrievedAssistants = await openai.beta.assistants.list()
        const dbResponse = retrievedAssistants.data
        return dbResponse
    } catch (error) {
        throw new Error(`Error: openaiAssistantsService.getAllOpenaiAssistants - ${error}`)
    }
}

// Get assistant object
const getSingleOpenaiAssistant = async (credentialId: string, assistantId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            return {
                executionError: true,
                status: 404,
                msg: `Credential ${credentialId} not found in the database!`
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
        const dbResponse = await openai.beta.assistants.retrieve(assistantId)
        const resp = await openai.files.list()
        const existingFiles = resp.data ?? []
        if (dbResponse.file_ids && dbResponse.file_ids.length) {
            ;(dbResponse as any).files = existingFiles.filter((file) => dbResponse.file_ids.includes(file.id))
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: openaiAssistantsService.getSingleOpenaiAssistant - ${error}`)
    }
}

export default {
    getAllOpenaiAssistants,
    getSingleOpenaiAssistant
}
