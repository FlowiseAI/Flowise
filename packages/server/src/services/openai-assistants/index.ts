import OpenAI from 'openai'
import { decryptCredentialData } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { ApiError } from '../../errors/apiError'
import { StatusCodes } from 'http-status-codes'

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
            throw new ApiError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found in the database!`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        const openAIApiKey = decryptedCredentialData['openAIApiKey']
        if (!openAIApiKey) {
            throw new ApiError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
        }
        const openai = new OpenAI({ apiKey: openAIApiKey })
        const retrievedAssistants = await openai.beta.assistants.list()
        const dbResponse = retrievedAssistants.data
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: openaiAssistantsService.getAllOpenaiAssistants - ${error}`)
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
            throw new ApiError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found in the database!`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        const openAIApiKey = decryptedCredentialData['openAIApiKey']
        if (!openAIApiKey) {
            throw new ApiError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
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
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: openaiAssistantsService.getSingleOpenaiAssistant - ${error}`)
    }
}

export default {
    getAllOpenaiAssistants,
    getSingleOpenaiAssistant
}
