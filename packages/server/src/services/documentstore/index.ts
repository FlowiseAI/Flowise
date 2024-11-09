import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { DocumentStore } from '../../database/entities/DocumentStore'
import {
    addSingleFileToStorage,
    getFileFromStorage,
    ICommonObject,
    IDocument,
    removeFilesFromStorage,
    removeSpecificFileFromStorage
} from 'flowise-components'
import {
    ChatType,
    DocumentStoreStatus,
    IDocumentStoreFileChunkPagedResponse,
    IDocumentStoreLoader,
    IDocumentStoreLoaderFile,
    IDocumentStoreLoaderForPreview,
    IDocumentStoreWhereUsed,
    INodeData
} from '../../Interface'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { v4 as uuidv4 } from 'uuid'
import { databaseEntities, getAppVersion, saveUpsertFlowData } from '../../utils'
import logger from '../../utils/logger'
import nodesService from '../nodes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../../errors/utils'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Document } from '@langchain/core/documents'
import { App } from '../../index'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { cloneDeep, omit } from 'lodash'
import { FLOWISE_COUNTER_STATUS, FLOWISE_METRIC_COUNTERS } from '../../Interface.Metrics'

const DOCUMENT_STORE_BASE_FOLDER = 'docustore'

const createDocumentStore = async (newDocumentStore: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        const documentStore = appServer.AppDataSource.getRepository(DocumentStore).create(newDocumentStore)
        const dbResponse = await appServer.AppDataSource.getRepository(DocumentStore).save(documentStore)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.createDocumentStore - ${getErrorMessage(error)}`
        )
    }
}

const getAllDocumentStores = async () => {
    try {
        const appServer = getRunningExpressApp()
        const entities = await appServer.AppDataSource.getRepository(DocumentStore).find()
        return entities
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getAllDocumentStores - ${getErrorMessage(error)}`
        )
    }
}

const getAllDocumentFileChunks = async () => {
    try {
        const appServer = getRunningExpressApp()
        const entities = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find()
        return entities
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getAllDocumentFileChunks - ${getErrorMessage(error)}`
        )
    }
}

const deleteLoaderFromDocumentStore = async (storeId: string, loaderId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.deleteLoaderFromDocumentStore - Document store ${storeId} not found`
            )
        }
        const existingLoaders = JSON.parse(entity.loaders)
        const found = existingLoaders.find((uFile: IDocumentStoreLoader) => uFile.id === loaderId)
        if (found) {
            if (found.files?.length) {
                for (const file of found.files) {
                    if (file.name) {
                        await removeSpecificFileFromStorage(DOCUMENT_STORE_BASE_FOLDER, storeId, file.name)
                    }
                }
            }
            const index = existingLoaders.indexOf(found)
            if (index > -1) {
                existingLoaders.splice(index, 1)
            }
            // remove the chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

            entity.loaders = JSON.stringify(existingLoaders)
            const results = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return results
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to locate loader in Document Store ${entity.name}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteLoaderFromDocumentStore - ${getErrorMessage(error)}`
        )
    }
}

const getDocumentStoreById = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.getDocumentStoreById - Document store ${storeId} not found`
            )
        }
        return entity
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getDocumentStoreById - ${getErrorMessage(error)}`
        )
    }
}

const getUsedChatflowNames = async (entity: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        if (entity.whereUsed) {
            const whereUsed = JSON.parse(entity.whereUsed)
            const updatedWhereUsed: IDocumentStoreWhereUsed[] = []
            for (let i = 0; i < whereUsed.length; i++) {
                const associatedChatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
                    where: { id: whereUsed[i] },
                    select: ['id', 'name']
                })
                if (associatedChatflow) {
                    updatedWhereUsed.push({
                        id: whereUsed[i],
                        name: associatedChatflow.name
                    })
                }
            }
            return updatedWhereUsed
        }
        return []
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getUsedChatflowNames - ${getErrorMessage(error)}`
        )
    }
}

// Get chunks for a specific loader or store
const getDocumentStoreFileChunks = async (storeId: string, fileId: string, pageNo: number = 1) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.getDocumentStoreById - Document store ${storeId} not found`
            )
        }
        const loaders = JSON.parse(entity.loaders)

        let found: IDocumentStoreLoader | undefined
        if (fileId !== 'all') {
            found = loaders.find((loader: IDocumentStoreLoader) => loader.id === fileId)
            if (!found) {
                throw new InternalFlowiseError(
                    StatusCodes.NOT_FOUND,
                    `Error: documentStoreServices.getDocumentStoreById - Document file ${fileId} not found`
                )
            }
        }
        let totalChars = 0
        loaders.forEach((loader: IDocumentStoreLoader) => {
            totalChars += loader.totalChars
        })
        if (found) {
            found.totalChars = totalChars
            found.id = fileId
            found.status = entity.status
        }
        const PAGE_SIZE = 50
        const skip = (pageNo - 1) * PAGE_SIZE
        const take = PAGE_SIZE
        let whereCondition: any = { docId: fileId }
        if (fileId === 'all') {
            whereCondition = { storeId: storeId }
        }
        const count = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).count({
            where: whereCondition
        })
        const chunksWithCount = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find({
            skip,
            take,
            where: whereCondition,
            order: {
                chunkNo: 'ASC'
            }
        })

        if (!chunksWithCount) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `File ${fileId} not found`)
        }

        const response: IDocumentStoreFileChunkPagedResponse = {
            chunks: chunksWithCount,
            count: count,
            file: found,
            currentPage: pageNo,
            storeName: entity.name,
            description: entity.description
        }
        return response
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getDocumentStoreFileChunks - ${getErrorMessage(error)}`
        )
    }
}

const deleteDocumentStore = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        // delete all the chunks associated with the store
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({
            storeId: storeId
        })
        // now delete the files associated with the store
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
        }
        await removeFilesFromStorage(DOCUMENT_STORE_BASE_FOLDER, entity.id)

        // delete upsert history
        await appServer.AppDataSource.getRepository(UpsertHistory).delete({
            chatflowid: storeId
        })

        // now delete the store
        const tbd = await appServer.AppDataSource.getRepository(DocumentStore).delete({
            id: storeId
        })

        return { deleted: tbd.affected }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteDocumentStore - ${getErrorMessage(error)}`
        )
    }
}

const deleteDocumentStoreFileChunk = async (storeId: string, docId: string, chunkId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
        }
        const loaders = JSON.parse(entity.loaders)
        const found = loaders.find((ldr: IDocumentStoreLoader) => ldr.id === docId)
        if (!found) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store loader ${docId} not found`)
        }

        const tbdChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
            id: chunkId
        })
        if (!tbdChunk) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document Chunk ${chunkId} not found`)
        }
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete(chunkId)
        found.totalChunks--
        found.totalChars -= tbdChunk.pageContent.length
        entity.loaders = JSON.stringify(loaders)
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return getDocumentStoreFileChunks(storeId, docId)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteDocumentStoreFileChunk - ${getErrorMessage(error)}`
        )
    }
}

const deleteVectorStoreFromStore = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
        }

        if (!entity.embeddingConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Embedding for Document store ${storeId} not found`)
        }

        if (!entity.vectorStoreConfig) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Vector Store for Document store ${storeId} not found`)
        }

        if (!entity.recordManagerConfig) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Record Manager for Document Store ${storeId} is needed to delete data from Vector Store`
            )
        }

        const options: ICommonObject = {
            chatflowid: storeId,
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        // Get Record Manager Instance
        const recordManagerConfig = JSON.parse(entity.recordManagerConfig)
        const recordManagerObj = await _createRecordManagerObject(
            appServer,
            { recordManagerName: recordManagerConfig.name, recordManagerConfig: recordManagerConfig.config },
            options
        )

        // Get Embeddings Instance
        const embeddingConfig = JSON.parse(entity.embeddingConfig)
        const embeddingObj = await _createEmbeddingsObject(
            appServer,
            { embeddingName: embeddingConfig.name, embeddingConfig: embeddingConfig.config },
            options
        )

        // Get Vector Store Node Data
        const vectorStoreConfig = JSON.parse(entity.vectorStoreConfig)
        const vStoreNodeData = _createVectorStoreNodeData(
            appServer,
            { vectorStoreName: vectorStoreConfig.name, vectorStoreConfig: vectorStoreConfig.config },
            embeddingObj,
            recordManagerObj
        )

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(
            appServer,
            { vectorStoreName: vectorStoreConfig.name, vectorStoreConfig: vectorStoreConfig.config },
            vStoreNodeData
        )
        const idsToDelete: string[] = [] // empty ids because we get it dynamically from the record manager

        // Call the delete method of the vector store
        if (vectorStoreObj.vectorStoreMethods.delete) {
            await vectorStoreObj.vectorStoreMethods.delete(vStoreNodeData, idsToDelete, options)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteVectorStoreFromStore - ${getErrorMessage(error)}`
        )
    }
}

const editDocumentStoreFileChunk = async (storeId: string, docId: string, chunkId: string, content: string, metadata: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
        }
        const loaders = JSON.parse(entity.loaders)
        const found = loaders.find((ldr: IDocumentStoreLoader) => ldr.id === docId)
        if (!found) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store loader ${docId} not found`)
        }

        const editChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
            id: chunkId
        })
        if (!editChunk) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document Chunk ${chunkId} not found`)
        }
        found.totalChars -= editChunk.pageContent.length
        editChunk.pageContent = content
        editChunk.metadata = JSON.stringify(metadata)
        found.totalChars += content.length
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(editChunk)
        entity.loaders = JSON.stringify(loaders)
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return getDocumentStoreFileChunks(storeId, docId)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.editDocumentStoreFileChunk - ${getErrorMessage(error)}`
        )
    }
}

// Update documentStore
const updateDocumentStore = async (documentStore: DocumentStore, updatedDocumentStore: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        const tmpUpdatedDocumentStore = appServer.AppDataSource.getRepository(DocumentStore).merge(documentStore, updatedDocumentStore)
        const dbResponse = await appServer.AppDataSource.getRepository(DocumentStore).save(tmpUpdatedDocumentStore)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.updateDocumentStore - ${getErrorMessage(error)}`
        )
    }
}

const _saveFileToStorage = async (fileBase64: string, entity: DocumentStore) => {
    const splitDataURI = fileBase64.split(',')
    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
    const mimePrefix = splitDataURI.pop()
    let mime = ''
    if (mimePrefix) {
        mime = mimePrefix.split(';')[0].split(':')[1]
    }
    await addSingleFileToStorage(mime, bf, filename, DOCUMENT_STORE_BASE_FOLDER, entity.id)
    return {
        id: uuidv4(),
        name: filename,
        mimePrefix: mime,
        size: bf.length,
        status: DocumentStoreStatus.NEW,
        uploaded: new Date()
    }
}

const _splitIntoChunks = async (data: IDocumentStoreLoaderForPreview) => {
    try {
        const appServer = getRunningExpressApp()
        let splitterInstance = null
        if (data.splitterConfig && Object.keys(data.splitterConfig).length > 0) {
            const nodeInstanceFilePath = appServer.nodesPool.componentNodes[data.splitterId].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newNodeInstance = new nodeModule.nodeClass()
            let nodeData = {
                inputs: { ...data.splitterConfig },
                id: 'splitter_0'
            }
            splitterInstance = await newNodeInstance.init(nodeData)
        }
        const nodeInstanceFilePath = appServer.nodesPool.componentNodes[data.loaderId].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        // doc loader configs
        const nodeData = {
            credential: data.credential || undefined,
            inputs: { ...data.loaderConfig, textSplitter: splitterInstance },
            outputs: { output: 'document' }
        }
        const options: ICommonObject = {
            chatflowid: uuidv4(),
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }
        const docNodeInstance = new nodeModule.nodeClass()
        let docs: IDocument[] = await docNodeInstance.init(nodeData, '', options)
        return docs
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.splitIntoChunks - ${getErrorMessage(error)}`
        )
    }
}

const _normalizeFilePaths = async (data: IDocumentStoreLoaderForPreview, entity: DocumentStore | null) => {
    const keys = Object.getOwnPropertyNames(data.loaderConfig)
    let rehydrated = false
    for (let i = 0; i < keys.length; i++) {
        const input = data.loaderConfig[keys[i]]
        if (!input) {
            continue
        }
        if (typeof input !== 'string') {
            continue
        }
        let documentStoreEntity: DocumentStore | null = entity
        if (input.startsWith('FILE-STORAGE::')) {
            if (!documentStoreEntity) {
                const appServer = getRunningExpressApp()
                documentStoreEntity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
                    id: data.storeId
                })
                if (!documentStoreEntity) {
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${data.storeId} not found`)
                }
            }
            const fileName = input.replace('FILE-STORAGE::', '')
            let files: string[] = []
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const loaders = JSON.parse(documentStoreEntity.loaders)
            const currentLoader = loaders.find((ldr: IDocumentStoreLoader) => ldr.id === data.id)
            if (currentLoader) {
                const base64Files: string[] = []
                for (const file of files) {
                    const bf = await getFileFromStorage(file, DOCUMENT_STORE_BASE_FOLDER, documentStoreEntity.id)
                    // find the file entry that has the same name as the file
                    const uploadedFile = currentLoader.files.find((uFile: IDocumentStoreLoaderFile) => uFile.name === file)
                    const mimePrefix = 'data:' + uploadedFile.mimePrefix + ';base64'
                    const base64String = mimePrefix + ',' + bf.toString('base64') + `,filename:${file}`
                    base64Files.push(base64String)
                }
                data.loaderConfig[keys[i]] = JSON.stringify(base64Files)
                rehydrated = true
            }
        }
    }
    data.rehydrated = rehydrated
}

const previewChunks = async (data: IDocumentStoreLoaderForPreview) => {
    try {
        if (data.preview) {
            if (
                data.loaderId === 'cheerioWebScraper' ||
                data.loaderId === 'puppeteerWebScraper' ||
                data.loaderId === 'playwrightWebScraper'
            ) {
                data.loaderConfig['limit'] = 3
            }
        }
        if (!data.rehydrated) {
            await _normalizeFilePaths(data, null)
        }
        let docs = await _splitIntoChunks(data)
        const totalChunks = docs.length
        // if -1, return all chunks
        if (data.previewChunkCount === -1) data.previewChunkCount = totalChunks
        // return all docs if the user ask for more than we have
        if (totalChunks <= data.previewChunkCount) data.previewChunkCount = totalChunks
        // return only the first n chunks
        if (totalChunks > data.previewChunkCount) docs = docs.slice(0, data.previewChunkCount)

        return { chunks: docs, totalChunks: totalChunks, previewChunkCount: data.previewChunkCount }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.previewChunks - ${getErrorMessage(error)}`
        )
    }
}

const processAndSaveChunks = async (data: IDocumentStoreLoaderForPreview) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.processAndSaveChunks - Document store ${data.storeId} not found`
            )
        }
        const existingLoaders = JSON.parse(entity.loaders)
        const newLoaderId = data.id ?? uuidv4()
        const found = existingLoaders.find((ldr: IDocumentStoreLoader) => ldr.id === newLoaderId)
        if (found) {
            const foundIndex = existingLoaders.findIndex((ldr: IDocumentStoreLoader) => ldr.id === newLoaderId)

            if (!data.loaderId) data.loaderId = found.loaderId
            if (!data.loaderName) data.loaderName = found.loaderName
            if (!data.loaderConfig) data.loaderConfig = found.loaderConfig
            if (!data.splitterId) data.splitterId = found.splitterId
            if (!data.splitterName) data.splitterName = found.splitterName
            if (!data.splitterConfig) data.splitterConfig = found.splitterConfig
            if (found.credential) {
                data.credential = found.credential
            }

            let loader: IDocumentStoreLoader = {
                ...found,
                loaderId: data.loaderId,
                loaderName: data.loaderName,
                loaderConfig: data.loaderConfig,
                splitterId: data.splitterId,
                splitterName: data.splitterName,
                splitterConfig: data.splitterConfig,
                totalChunks: 0,
                totalChars: 0,
                status: DocumentStoreStatus.SYNCING
            }
            if (data.credential) {
                loader.credential = data.credential
            }

            existingLoaders[foundIndex] = loader
            entity.loaders = JSON.stringify(existingLoaders)
        } else {
            let loader: IDocumentStoreLoader = {
                id: newLoaderId,
                loaderId: data.loaderId,
                loaderName: data.loaderName,
                loaderConfig: data.loaderConfig,
                splitterId: data.splitterId,
                splitterName: data.splitterName,
                splitterConfig: data.splitterConfig,
                totalChunks: 0,
                totalChars: 0,
                status: DocumentStoreStatus.SYNCING
            }
            if (data.credential) {
                loader.credential = data.credential
            }
            existingLoaders.push(loader)
            entity.loaders = JSON.stringify(existingLoaders)
        }
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        // this method will run async, will have to be moved to a worker thread
        _saveChunksToStorage(data, entity, newLoaderId).then(() => {})
        return getDocumentStoreFileChunks(data.storeId as string, newLoaderId)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.processAndSaveChunks - ${getErrorMessage(error)}`
        )
    }
}

const _saveChunksToStorage = async (data: IDocumentStoreLoaderForPreview, entity: DocumentStore, newLoaderId: string) => {
    const re = new RegExp('^data.*;base64', 'i')

    try {
        const appServer = getRunningExpressApp()
        //step 1: restore the full paths, if any
        await _normalizeFilePaths(data, entity)
        //step 2: split the file into chunks
        previewChunks(data).then(async (response) => {
            //step 3: remove all files associated with the loader
            const existingLoaders = JSON.parse(entity.loaders)
            const loader = existingLoaders.find((ldr: IDocumentStoreLoader) => ldr.id === newLoaderId)
            if (data.id) {
                const index = existingLoaders.indexOf(loader)
                if (index > -1) {
                    existingLoaders.splice(index, 1)
                    if (!data.rehydrated) {
                        if (loader.files) {
                            loader.files.map(async (file: IDocumentStoreLoaderFile) => {
                                await removeSpecificFileFromStorage(DOCUMENT_STORE_BASE_FOLDER, entity.id, file.name)
                            })
                        }
                    }
                }
            }
            //step 4: save new file to storage
            let filesWithMetadata = []
            const keys = Object.getOwnPropertyNames(data.loaderConfig)
            for (let i = 0; i < keys.length; i++) {
                const input = data.loaderConfig[keys[i]]
                if (!input) {
                    continue
                }
                if (typeof input !== 'string') {
                    continue
                }
                if (input.startsWith('[') && input.endsWith(']')) {
                    const files = JSON.parse(input)
                    const fileNames: string[] = []
                    for (let j = 0; j < files.length; j++) {
                        const file = files[j]
                        if (re.test(file)) {
                            const fileMetadata = await _saveFileToStorage(file, entity)
                            fileNames.push(fileMetadata.name)
                            filesWithMetadata.push(fileMetadata)
                        }
                    }
                    data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
                } else if (re.test(input)) {
                    const fileNames: string[] = []
                    const fileMetadata = await _saveFileToStorage(input, entity)
                    fileNames.push(fileMetadata.name)
                    filesWithMetadata.push(fileMetadata)
                    data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
                    break
                }
            }
            //step 5: update with the new files and loaderConfig
            if (filesWithMetadata.length > 0) {
                loader.loaderConfig = data.loaderConfig
                loader.files = filesWithMetadata
            }
            //step 6: update the loaders with the new loaderConfig
            if (data.id) {
                existingLoaders.push(loader)
            }
            //step 7: remove all previous chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: newLoaderId })
            if (response.chunks) {
                //step 8: now save the new chunks
                const totalChars = response.chunks.reduce((acc, chunk) => {
                    if (chunk.pageContent) {
                        return acc + chunk.pageContent.length
                    }
                    return acc
                }, 0)
                response.chunks.map(async (chunk: IDocument, index: number) => {
                    const docChunk: DocumentStoreFileChunk = {
                        docId: newLoaderId,
                        storeId: data.storeId || '',
                        id: uuidv4(),
                        chunkNo: index + 1,
                        pageContent: chunk.pageContent,
                        metadata: JSON.stringify(chunk.metadata)
                    }
                    const dChunk = appServer.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
                    await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
                })
                // update the loader with the new metrics
                loader.totalChunks = response.totalChunks
                loader.totalChars = totalChars
            }
            loader.status = 'SYNC'
            // have a flag and iterate over the loaders and update the entity status to SYNC
            const allSynced = existingLoaders.every((ldr: IDocumentStoreLoader) => ldr.status === 'SYNC')
            entity.status = allSynced ? DocumentStoreStatus.SYNC : DocumentStoreStatus.STALE
            entity.loaders = JSON.stringify(existingLoaders)
            //step 9: update the entity in the database
            await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices._saveChunksToStorage - ${getErrorMessage(error)}`
        )
    }
}

// Get all component nodes
const getDocumentLoaders = async () => {
    const removeDocumentLoadersWithName = ['documentStore', 'vectorStoreToDocument', 'unstructuredFolderLoader', 'folderFiles']

    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Document Loaders')
        return dbResponse.filter((node) => !removeDocumentLoadersWithName.includes(node.name))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getDocumentLoaders - ${getErrorMessage(error)}`
        )
    }
}

const updateDocumentStoreUsage = async (chatId: string, storeId: string | undefined) => {
    try {
        // find the document store
        const appServer = getRunningExpressApp()
        // find all entities that have the chatId in their whereUsed
        const entities = await appServer.AppDataSource.getRepository(DocumentStore).find()
        entities.map(async (entity: DocumentStore) => {
            const whereUsed = JSON.parse(entity.whereUsed)
            const found = whereUsed.find((w: string) => w === chatId)
            if (found) {
                if (!storeId) {
                    // remove the chatId from the whereUsed, as the store is being deleted
                    const index = whereUsed.indexOf(chatId)
                    if (index > -1) {
                        whereUsed.splice(index, 1)
                        entity.whereUsed = JSON.stringify(whereUsed)
                        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
                    }
                } else if (entity.id === storeId) {
                    // do nothing, already found and updated
                } else if (entity.id !== storeId) {
                    // remove the chatId from the whereUsed, as a new store is being used
                    const index = whereUsed.indexOf(chatId)
                    if (index > -1) {
                        whereUsed.splice(index, 1)
                        entity.whereUsed = JSON.stringify(whereUsed)
                        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
                    }
                }
            } else {
                if (entity.id === storeId) {
                    // add the chatId to the whereUsed
                    whereUsed.push(chatId)
                    entity.whereUsed = JSON.stringify(whereUsed)
                    await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
                }
            }
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.updateDocumentStoreUsage - ${getErrorMessage(error)}`
        )
    }
}

const updateVectorStoreConfigOnly = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${data.storeId} not found`)
        }

        if (data.vectorStoreName) {
            entity.vectorStoreConfig = JSON.stringify({
                config: data.vectorStoreConfig,
                name: data.vectorStoreName
            })

            const updatedEntity = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return updatedEntity
        }
        return {}
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.updateVectorStoreConfig - ${getErrorMessage(error)}`
        )
    }
}
const saveVectorStoreConfig = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Document store ${data.storeId} not found`)
        }

        if (data.embeddingName) {
            entity.embeddingConfig = JSON.stringify({
                config: data.embeddingConfig,
                name: data.embeddingName
            })
        } else if (entity.embeddingConfig && !data.embeddingName && !data.embeddingConfig) {
            data.embeddingConfig = JSON.parse(entity.embeddingConfig)?.config
            data.embeddingName = JSON.parse(entity.embeddingConfig)?.name
        } else if (!data.embeddingName && !data.embeddingConfig) {
            entity.embeddingConfig = null
        }

        if (data.vectorStoreName) {
            entity.vectorStoreConfig = JSON.stringify({
                config: data.vectorStoreConfig,
                name: data.vectorStoreName
            })
        } else if (entity.vectorStoreConfig && !data.vectorStoreName && !data.vectorStoreConfig) {
            data.vectorStoreConfig = JSON.parse(entity.vectorStoreConfig)?.config
            data.vectorStoreName = JSON.parse(entity.vectorStoreConfig)?.name
        } else if (!data.vectorStoreName && !data.vectorStoreConfig) {
            entity.vectorStoreConfig = null
        }

        if (data.recordManagerName) {
            entity.recordManagerConfig = JSON.stringify({
                config: data.recordManagerConfig,
                name: data.recordManagerName
            })
        } else if (entity.recordManagerConfig && !data.recordManagerName && !data.recordManagerConfig) {
            data.recordManagerConfig = JSON.parse(entity.recordManagerConfig)?.config
            data.recordManagerName = JSON.parse(entity.recordManagerConfig)?.name
        } else if (!data.recordManagerName && !data.recordManagerConfig) {
            entity.recordManagerConfig = null
        }

        if (entity.status !== DocumentStoreStatus.UPSERTED && (data.vectorStoreName || data.recordManagerName || data.embeddingName)) {
            // if the store is not already in sync, mark it as sync
            // this also means that the store is not yet sync'ed to vector store
            entity.status = DocumentStoreStatus.SYNC
        }
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return entity
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.saveVectorStoreConfig - ${getErrorMessage(error)}`
        )
    }
}

const insertIntoVectorStore = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await saveVectorStoreConfig(data)
        entity.status = DocumentStoreStatus.UPSERTING
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)

        // TODO: to be moved into a worker thread...
        const indexResult = await _insertIntoVectorStoreWorkerThread(data)
        return indexResult
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.insertIntoVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const _insertIntoVectorStoreWorkerThread = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await saveVectorStoreConfig(data)
        let upsertHistory: Record<string, any> = {}
        const chatflowid = data.storeId // fake chatflowid because this is not tied to any chatflow

        const options: ICommonObject = {
            chatflowid,
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        let recordManagerObj = undefined

        // Get Record Manager Instance
        if (data.recordManagerName && data.recordManagerConfig) {
            recordManagerObj = await _createRecordManagerObject(appServer, data, options, upsertHistory)
        }

        // Get Embeddings Instance
        const embeddingObj = await _createEmbeddingsObject(appServer, data, options, upsertHistory)

        // Get Vector Store Node Data
        const vStoreNodeData = _createVectorStoreNodeData(appServer, data, embeddingObj, recordManagerObj)
        // Prepare docs for upserting
        const chunks = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find({
            where: {
                storeId: data.storeId
            }
        })
        const docs: Document[] = chunks.map((chunk: DocumentStoreFileChunk) => {
            return new Document({
                pageContent: chunk.pageContent,
                metadata: JSON.parse(chunk.metadata)
            })
        })
        vStoreNodeData.inputs.document = docs

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(appServer, data, vStoreNodeData, upsertHistory)
        const indexResult = await vectorStoreObj.vectorStoreMethods.upsert(vStoreNodeData, options)

        // Save to DB
        if (indexResult) {
            const result = cloneDeep(upsertHistory)
            result['flowData'] = JSON.stringify(result['flowData'])
            result['result'] = JSON.stringify(omit(indexResult, ['totalKeys', 'addedDocs']))
            result.chatflowid = chatflowid
            const newUpsertHistory = new UpsertHistory()
            Object.assign(newUpsertHistory, result)
            const upsertHistoryItem = appServer.AppDataSource.getRepository(UpsertHistory).create(newUpsertHistory)
            await appServer.AppDataSource.getRepository(UpsertHistory).save(upsertHistoryItem)
        }

        await appServer.telemetry.sendTelemetry('vector_upserted', {
            version: await getAppVersion(),
            chatlowId: chatflowid,
            type: ChatType.INTERNAL,
            flowGraph: omit(indexResult['result'], ['totalKeys', 'addedDocs'])
        })
        appServer.metricsProvider?.incrementCounter(FLOWISE_METRIC_COUNTERS.VECTORSTORE_UPSERT, { status: FLOWISE_COUNTER_STATUS.SUCCESS })

        entity.status = DocumentStoreStatus.UPSERTED
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)

        return indexResult ?? { result: 'Successfully Upserted' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices._insertIntoVectorStoreWorkerThread - ${getErrorMessage(error)}`
        )
    }
}

// Get all component nodes - Embeddings
const getEmbeddingProviders = async () => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Embeddings')
        return dbResponse.filter((node) => !node.tags?.includes('LlamaIndex'))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getEmbeddingProviders - ${getErrorMessage(error)}`
        )
    }
}

// Get all component nodes - Vector Stores
const getVectorStoreProviders = async () => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Vector Stores')
        return dbResponse.filter(
            (node) => !node.tags?.includes('LlamaIndex') && node.name !== 'documentStoreVS' && node.name !== 'memoryVectorStore'
        )
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getVectorStoreProviders - ${getErrorMessage(error)}`
        )
    }
}
// Get all component nodes - Vector Stores
const getRecordManagerProviders = async () => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Record Manager')
        return dbResponse.filter((node) => !node.tags?.includes('LlamaIndex'))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getRecordManagerProviders - ${getErrorMessage(error)}`
        )
    }
}

const queryVectorStore = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Document store ${data.storeId} not found`)
        }
        const options: ICommonObject = {
            chatflowid: uuidv4(),
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        if (!entity.embeddingConfig) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Embedding for ${data.storeId} is not configured`)
        }

        if (!entity.vectorStoreConfig) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Vector Store for ${data.storeId} is not configured`)
        }

        const embeddingConfig = JSON.parse(entity.embeddingConfig)
        data.embeddingName = embeddingConfig.name
        data.embeddingConfig = embeddingConfig.config
        let embeddingObj = await _createEmbeddingsObject(appServer, data, options)

        const vsConfig = JSON.parse(entity.vectorStoreConfig)
        data.vectorStoreName = vsConfig.name
        data.vectorStoreConfig = vsConfig.config
        if (data.inputs) {
            data.vectorStoreConfig = { ...vsConfig.config, ...data.inputs }
        }

        const vStoreNodeData = _createVectorStoreNodeData(appServer, data, embeddingObj, undefined)

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(appServer, data, vStoreNodeData)
        const retriever = await vectorStoreObj.init(vStoreNodeData, '', options)
        if (!retriever) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create retriever`)
        }
        const startMillis = Date.now()
        const results = await retriever.invoke(data.query, undefined)
        if (!results) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to retrieve results`)
        }
        const endMillis = Date.now()
        const timeTaken = endMillis - startMillis
        const docs: any = results.map((result: IDocument) => {
            return {
                pageContent: result.pageContent,
                metadata: result.metadata,
                id: uuidv4()
            }
        })
        // query our document store chunk with the storeId and pageContent
        for (const doc of docs) {
            const documentStoreChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
                storeId: data.storeId,
                pageContent: doc.pageContent
            })
            if (documentStoreChunk) {
                doc.id = documentStoreChunk.id
                doc.chunkNo = documentStoreChunk.chunkNo
            } else {
                // this should not happen, only possible if the vector store has more content
                // than our document store
                doc.id = uuidv4()
                doc.chunkNo = -1
            }
        }

        return {
            timeTaken: timeTaken,
            docs: docs
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.queryVectorStore - ${getErrorMessage(error)}`
        )
    }
}

const _createEmbeddingsObject = async (
    appServer: App,
    data: ICommonObject,
    options: ICommonObject,
    upsertHistory?: Record<string, any>
): Promise<any> => {
    // prepare embedding node data
    const embeddingComponent = appServer.nodesPool.componentNodes[data.embeddingName]
    const embeddingNodeData: any = {
        inputs: { ...data.embeddingConfig },
        outputs: { output: 'document' },
        id: `${embeddingComponent.name}_0`,
        label: embeddingComponent.label,
        name: embeddingComponent.name,
        category: embeddingComponent.category,
        inputParams: embeddingComponent.inputs || []
    }
    if (data.embeddingConfig.credential) {
        embeddingNodeData.credential = data.embeddingConfig.credential
    }

    // save to upsert history
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(embeddingNodeData, upsertHistory)

    // init embedding object
    const embeddingNodeInstanceFilePath = embeddingComponent.filePath as string
    const embeddingNodeModule = await import(embeddingNodeInstanceFilePath)
    const embeddingNodeInstance = new embeddingNodeModule.nodeClass()
    const embeddingObj = await embeddingNodeInstance.init(embeddingNodeData, '', options)
    if (!embeddingObj) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create EmbeddingObj`)
    }
    return embeddingObj
}

const _createRecordManagerObject = async (
    appServer: App,
    data: ICommonObject,
    options: ICommonObject,
    upsertHistory?: Record<string, any>
) => {
    // prepare record manager node data
    const recordManagerComponent = appServer.nodesPool.componentNodes[data.recordManagerName]
    const rmNodeData: any = {
        inputs: { ...data.recordManagerConfig },
        id: `${recordManagerComponent.name}_0`,
        inputParams: recordManagerComponent.inputs,
        label: recordManagerComponent.label,
        name: recordManagerComponent.name,
        category: recordManagerComponent.category
    }
    if (data.recordManagerConfig.credential) {
        rmNodeData.credential = data.recordManagerConfig.credential
    }

    // save to upsert history
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(rmNodeData, upsertHistory)

    // init record manager object
    const rmNodeInstanceFilePath = recordManagerComponent.filePath as string
    const rmNodeModule = await import(rmNodeInstanceFilePath)
    const rmNodeInstance = new rmNodeModule.nodeClass()
    const recordManagerObj = await rmNodeInstance.init(rmNodeData, '', options)
    if (!recordManagerObj) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create RecordManager obj`)
    }
    return recordManagerObj
}

const _createVectorStoreNodeData = (appServer: App, data: ICommonObject, embeddingObj: any, recordManagerObj?: any) => {
    const vectorStoreComponent = appServer.nodesPool.componentNodes[data.vectorStoreName]
    const vStoreNodeData: any = {
        id: `${vectorStoreComponent.name}_0`,
        inputs: { ...data.vectorStoreConfig },
        outputs: { output: 'retriever' },
        label: vectorStoreComponent.label,
        name: vectorStoreComponent.name,
        category: vectorStoreComponent.category
    }
    if (data.vectorStoreConfig.credential) {
        vStoreNodeData.credential = data.vectorStoreConfig.credential
    }

    if (embeddingObj) {
        vStoreNodeData.inputs.embeddings = embeddingObj
    }

    if (recordManagerObj) {
        vStoreNodeData.inputs.recordManager = recordManagerObj
    }

    // Get all input params except the ones that are anchor points to avoid JSON stringify circular error
    const filterInputParams = ['document', 'embeddings', 'recordManager']
    const inputParams = vectorStoreComponent.inputs?.filter((input) => !filterInputParams.includes(input.name))
    vStoreNodeData.inputParams = inputParams
    return vStoreNodeData
}

const _createVectorStoreObject = async (
    appServer: App,
    data: ICommonObject,
    vStoreNodeData: INodeData,
    upsertHistory?: Record<string, any>
) => {
    const vStoreNodeInstanceFilePath = appServer.nodesPool.componentNodes[data.vectorStoreName].filePath as string
    const vStoreNodeModule = await import(vStoreNodeInstanceFilePath)
    const vStoreNodeInstance = new vStoreNodeModule.nodeClass()
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(vStoreNodeData, upsertHistory)
    return vStoreNodeInstance
}

export default {
    updateDocumentStoreUsage,
    deleteDocumentStore,
    createDocumentStore,
    deleteLoaderFromDocumentStore,
    getAllDocumentStores,
    getAllDocumentFileChunks,
    getDocumentStoreById,
    getUsedChatflowNames,
    getDocumentStoreFileChunks,
    updateDocumentStore,
    previewChunks,
    processAndSaveChunks,
    deleteDocumentStoreFileChunk,
    editDocumentStoreFileChunk,
    getDocumentLoaders,
    insertIntoVectorStore,
    getEmbeddingProviders,
    getVectorStoreProviders,
    getRecordManagerProviders,
    saveVectorStoreConfig,
    queryVectorStore,
    deleteVectorStoreFromStore,
    updateVectorStoreConfigOnly
}
