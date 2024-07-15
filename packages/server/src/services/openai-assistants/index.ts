import OpenAI from 'openai'
import fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import { decryptCredentialData } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

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
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found in the database!`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        const openAIApiKey = decryptedCredentialData['openAIApiKey']
        if (!openAIApiKey) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
        }
        const openai = new OpenAI({ apiKey: openAIApiKey })
        const retrievedAssistants = await openai.beta.assistants.list()
        const dbResponse = retrievedAssistants.data
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsService.getAllOpenaiAssistants - ${getErrorMessage(error)}`
        )
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
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found in the database!`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        const openAIApiKey = decryptedCredentialData['openAIApiKey']
        if (!openAIApiKey) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
        }

        const openai = new OpenAI({ apiKey: openAIApiKey })
        const dbResponse = await openai.beta.assistants.retrieve(assistantId)
        const resp = await openai.files.list()
        const existingFiles = resp.data ?? []
        if (dbResponse.tool_resources?.code_interpreter?.file_ids?.length) {
            ;(dbResponse.tool_resources.code_interpreter as any).files = [
                ...existingFiles.filter((file) => dbResponse.tool_resources?.code_interpreter?.file_ids?.includes(file.id))
            ]
        }
        if (dbResponse.tool_resources?.file_search?.vector_store_ids?.length) {
            // Since there can only be 1 vector store per assistant
            const vectorStoreId = dbResponse.tool_resources.file_search.vector_store_ids[0]
            const vectorStoreFiles = await openai.beta.vectorStores.files.list(vectorStoreId)
            const fileIds = vectorStoreFiles.data?.map((file) => file.id) ?? []
            ;(dbResponse.tool_resources.file_search as any).files = [...existingFiles.filter((file) => fileIds.includes(file.id))]
            ;(dbResponse.tool_resources.file_search as any).vector_store_object = await openai.beta.vectorStores.retrieve(vectorStoreId)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsService.getSingleOpenaiAssistant - ${getErrorMessage(error)}`
        )
    }
}

const uploadFilesToAssistant = async (credentialId: string, files: { filePath: string; fileName: string }[]) => {
    const appServer = getRunningExpressApp()
    const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
        id: credentialId
    })
    if (!credential) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found in the database!`)
    }
    // Decrpyt credentialData
    const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
    const openAIApiKey = decryptedCredentialData['openAIApiKey']
    if (!openAIApiKey) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `OpenAI ApiKey not found`)
    }

    const openai = new OpenAI({ apiKey: openAIApiKey })
    const uploadedFiles = []

    for (const file of files) {
        const toFile = await OpenAI.toFile(fs.readFileSync(file.filePath), file.fileName)
        const createdFile = await openai.files.create({
            file: toFile,
            purpose: 'assistants'
        })
        uploadedFiles.push(createdFile)
        fs.unlinkSync(file.filePath)
    }

    return uploadedFiles
}

export default {
    getAllOpenaiAssistants,
    getSingleOpenaiAssistant,
    uploadFilesToAssistant
}
