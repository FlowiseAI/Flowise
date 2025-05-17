import OpenAI from 'openai'
import { StatusCodes } from 'http-status-codes'
import { Credential } from '../../database/entities/Credential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { decryptCredentialData } from '../../utils'
import { getFileFromUpload, removeSpecificFileFromUpload } from 'flowise-components'

const getAssistantVectorStore = async (credentialId: string, vectorStoreId: string) => {
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
        const dbResponse = await openai.vectorStores.retrieve(vectorStoreId)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.getAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const listAssistantVectorStore = async (credentialId: string) => {
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
        const dbResponse = await openai.vectorStores.list()
        return dbResponse.data
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.listAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const createAssistantVectorStore = async (credentialId: string, obj: OpenAI.VectorStores.VectorStoreCreateParams) => {
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
        const dbResponse = await openai.vectorStores.create(obj)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.createAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const updateAssistantVectorStore = async (
    credentialId: string,
    vectorStoreId: string,
    obj: OpenAI.VectorStores.VectorStoreUpdateParams
) => {
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
        const dbResponse = await openai.vectorStores.update(vectorStoreId, obj)
        const vectorStoreFiles = await openai.vectorStores.files.list(vectorStoreId)
        if (vectorStoreFiles.data?.length) {
            const files = []
            for (const file of vectorStoreFiles.data) {
                const fileData = await openai.files.retrieve(file.id)
                files.push(fileData)
            }
            ;(dbResponse as any).files = files
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.updateAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const deleteAssistantVectorStore = async (credentialId: string, vectorStoreId: string) => {
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
        const dbResponse = await openai.vectorStores.del(vectorStoreId)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.deleteAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const uploadFilesToAssistantVectorStore = async (
    credentialId: string,
    vectorStoreId: string,
    files: { filePath: string; fileName: string }[]
): Promise<any> => {
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
        const uploadedFiles = []
        for (const file of files) {
            const fileBuffer = await getFileFromUpload(file.filePath)
            const toFile = await OpenAI.toFile(fileBuffer, file.fileName)
            const createdFile = await openai.files.create({
                file: toFile,
                purpose: 'assistants'
            })
            uploadedFiles.push(createdFile)
            await removeSpecificFileFromUpload(file.filePath)
        }

        const file_ids = [...uploadedFiles.map((file) => file.id)]

        const res = await openai.vectorStores.fileBatches.createAndPoll(vectorStoreId, {
            file_ids
        })
        if (res.status === 'completed' && res.file_counts.completed === uploadedFiles.length) return uploadedFiles
        else if (res.status === 'failed')
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Error: openaiAssistantsVectorStoreService.uploadFilesToAssistantVectorStore - Upload failed!'
            )
        else
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Error: openaiAssistantsVectorStoreService.uploadFilesToAssistantVectorStore - Upload cancelled!'
            )
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.uploadFilesToAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const deleteFilesFromAssistantVectorStore = async (credentialId: string, vectorStoreId: string, file_ids: string[]) => {
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
        const deletedFileIds = []
        let count = 0
        for (const file of file_ids) {
            const res = await openai.vectorStores.files.del(vectorStoreId, file)
            if (res.deleted) {
                deletedFileIds.push(file)
                count += 1
            }
        }

        return { deletedFileIds, count }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: openaiAssistantsVectorStoreService.uploadFilesToAssistantVectorStore - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAssistantVectorStore,
    listAssistantVectorStore,
    createAssistantVectorStore,
    updateAssistantVectorStore,
    deleteAssistantVectorStore,
    uploadFilesToAssistantVectorStore,
    deleteFilesFromAssistantVectorStore
}
