import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { DocumentStore } from '../../database/entities/DocumentStore'
// @ts-ignore
import { getStoragePath, ICommonObject } from 'flowise-components'
import fs from 'fs'
import path from 'path'
import { DocumentStoreStatus } from '../../Interface'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { v4 as uuidv4 } from 'uuid'
import { databaseEntities } from '../../utils'
import logger from '../../utils/logger'
import nodesService from '../nodes'

// Create new document store
const createDocumentStore = async (newDocumentStore: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        const documentStore = appServer.AppDataSource.getRepository(DocumentStore).create(newDocumentStore)
        const dbResponse = await appServer.AppDataSource.getRepository(DocumentStore).save(documentStore)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: documentStoreServices.createDocumentStore - ${error}`)
    }
}

const getAllDocumentStores = async () => {
    try {
        const appServer = getRunningExpressApp()
        const entities = await appServer.AppDataSource.getRepository(DocumentStore).find()
        return entities
    } catch (error) {
        throw new Error(`Error: documentStoreServices.getAllDocumentStores - ${error}`)
    }
}

const deleteLoaderFromDocumentStore = async (storeId: string, loaderId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
        if (!fs.existsSync(dir)) {
            throw new Error(`Missing folder to delete files for Document Store ${entity.name}`)
        }
        const existingLoaders = JSON.parse(entity.loaders)
        const found = existingLoaders.find((uFile: any) => uFile.id === loaderId)
        if (found) {
            if (found.path) {
                //remove the existing files, if any of the file loaders were used.
                fs.unlinkSync(found.path)
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
            throw new Error(`Unable to locate loader in Document Store ${entity.name}`)
        }
    } catch (error) {
        throw new Error(`Error: documentStoreServices.deleteLoaderFromDocumentStore - ${error}`)
    }
}

const getDocumentStoreById = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        return entity
    } catch (error) {
        throw new Error(`Error: documentStoreServices.getDocumentStoreById - ${error}`)
    }
}

// Get chunks for a specific file
const getDocumentStoreFileChunks = async (storeId: string, fileId: string, pageNo: number = 1) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const files = JSON.parse(entity.loaders)
        const found = files.find((file: any) => file.id === fileId)
        if (!found) throw new Error(`Document store file ${fileId} not found`)

        const PAGE_SIZE = 50
        const skip = (pageNo - 1) * PAGE_SIZE
        const take = PAGE_SIZE
        const count = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).count({
            where: { docId: fileId }
        })
        const chunksWithCount = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find({
            skip,
            take,
            where: { docId: fileId }
        })

        if (!chunksWithCount) throw new Error(`File ${fileId} not found`)
        found.storeName = entity.name
        return {
            chunks: chunksWithCount,
            count: count,
            file: found,
            currentPage: pageNo
        }
    } catch (error) {
        throw new Error(`Error: documentStoreServices.getDocumentStoreFileChunks - ${error}`)
    }
}

const deleteDocumentStoreFileChunk = async (storeId: string, docId: string, chunkId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const loaders = JSON.parse(entity.loaders)
        const found = loaders.find((ldr: any) => ldr.id === docId)
        if (!found) throw new Error(`Document store loader ${docId} not found`)

        const tbdChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
            id: chunkId
        })
        if (!tbdChunk) throw new Error(`Document Chunk ${chunkId} not found`)
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete(chunkId)
        found.totalChunks--
        found.totalChars -= tbdChunk.pageContent.length
        entity.loaders = JSON.stringify(loaders)
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return getDocumentStoreFileChunks(storeId, docId)
    } catch (error) {
        throw new Error(`Error: documentStoreServices.deleteDocumentStoreFileChunk - ${error}`)
    }
}

const editDocumentStoreFileChunk = async (storeId: string, docId: string, chunkId: string, content: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const loaders = JSON.parse(entity.loaders)
        const found = loaders.find((ldr: any) => ldr.id === docId)
        if (!found) throw new Error(`Document store loader ${docId} not found`)

        const editChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
            id: chunkId
        })
        if (!editChunk) throw new Error(`Document Chunk ${chunkId} not found`)
        found.totalChars -= editChunk.pageContent.length
        editChunk.pageContent = content
        found.totalChars += content.length
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(editChunk)
        entity.loaders = JSON.stringify(loaders)
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return getDocumentStoreFileChunks(storeId, docId)
    } catch (error) {
        throw new Error(`Error: documentStoreServices.editDocumentStoreFileChunk - ${error}`)
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
        throw new Error(`Error: documentStoreServices.updateDocumentStore - ${error}`)
    }
}

const _saveFileToStorage = (fileBase64: string, entity: DocumentStore) => {
    const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
    if (!fs.existsSync(dir)) {
        throw new Error(`Missing folder to upload files for Document Store ${entity.name}`)
    }
    const splitDataURI = fileBase64.split(',')
    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, bf)
    const stats = fs.statSync(filePath)
    return {
        id: uuidv4(),
        path: filePath,
        name: filename,
        mimePrefix: splitDataURI.pop(),
        size: stats.size,
        status: DocumentStoreStatus.NEW,
        uploaded: stats.birthtime,
        totalChunks: 0,
        totalChars: 0
    }
}

const _splitIntoChunks = async (data: any) => {
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
            inputs: { textSplitter: splitterInstance, ...data.loaderConfig },
            outputs: { output: 'document' }
        }
        const options: ICommonObject = {
            chatflowid: uuidv4(),
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }
        const docNodeInstance = new nodeModule.nodeClass()
        let docs = await docNodeInstance.init(nodeData, '', options)
        return docs
    } catch (error) {
        throw new Error(`Error: documentStoreServices.splitIntoChunks - ${error}`)
    }
}

const _normalizeFilePaths = async (data: any, entity: DocumentStore | null) => {
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
                if (!documentStoreEntity) throw new Error(`Document store ${data.storeId} not found`)
            }
            const fileName = input.replace('FILE-STORAGE::', '')
            let files: string[] = []
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const dir = path.join(getStoragePath(), 'datasource', documentStoreEntity.subFolder)
            if (!fs.existsSync(dir)) {
                throw new Error(`Missing folder to upload files for Document Store ${documentStoreEntity.name}`)
            }
            const loaders = JSON.parse(documentStoreEntity.loaders)
            const currentLoader = loaders.find((ldr: any) => ldr.id === data.id)
            if (currentLoader) {
                const base64Files: string[] = []
                for (const file of files) {
                    const fileInStorage = path.join(dir, file)
                    const fileData = fs.readFileSync(fileInStorage)
                    const bf = Buffer.from(fileData)
                    // find the file entry that has the same name as the file
                    const uploadedFile = currentLoader.files.find((uFile: any) => uFile.name === file)
                    const base64String = uploadedFile.mimePrefix + ',' + bf.toString('base64') + `,filename:${file}`
                    base64Files.push(base64String)
                }
                data.loaderConfig[keys[i]] = JSON.stringify(base64Files)
                rehydrated = true
            }
        }
    }
    data.rehydrated = rehydrated
}

const previewChunks = async (data: any) => {
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
        throw new Error(`Error: documentStoreServices.previewChunks - ${error}`)
    }
}

const processAndSaveChunks = async (data: any) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) throw new Error(`Document store ${data.storeId} not found`)

        const newLoaderId = data.id ?? uuidv4()
        const existingLoaders = JSON.parse(entity.loaders)
        const found = existingLoaders.find((ldr: any) => ldr.id === newLoaderId)
        if (found) {
            // clean up the current status and mark the loader as pending_sync
            found.totalChunks = 0
            found.totalChars = 0
            found.status = DocumentStoreStatus.SYNCING
            entity.loaders = JSON.stringify(existingLoaders)
        } else {
            let loader: any = {
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
        return getDocumentStoreFileChunks(data.storeId, newLoaderId)
    } catch (error) {
        throw new Error(`Error: documentStoreServices.processAndSaveChunks - ${error}`)
    }
}

const _saveChunksToStorage = async (data: any, entity: DocumentStore, newLoaderId: string) => {
    const re = new RegExp('^data.*;base64', 'i')

    try {
        const appServer = getRunningExpressApp()
        //step 1: restore the full paths, if any
        await _normalizeFilePaths(data, entity)
        //step 2: split the file into chunks
        previewChunks(data).then(async (response) => {
            //{ chunks: docs, totalChunks: totalChunks, previewChunkCount: data.previewChunkCount }
            //step 3: remove base64 files and save them to storage, this needs to be rewritten
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
                if (input.startsWith('[')) {
                    const files = JSON.parse(input)
                    const fileNames: string[] = []
                    for (let j = 0; j < files.length; j++) {
                        const file = files[j]
                        if (re.test(file)) {
                            const fileMetadata = _saveFileToStorage(file, entity)
                            fileNames.push(fileMetadata.name)
                            filesWithMetadata.push(fileMetadata)
                        }
                    }
                    data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
                } else if (re.test(input)) {
                    const fileNames: string[] = []
                    const fileMetadata = _saveFileToStorage(input, entity)
                    fileNames.push(fileMetadata.name)
                    filesWithMetadata.push(fileMetadata)
                    data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
                    break
                }
            }
            //step 4: create a new loader and save it to the document store
            const existingLoaders = JSON.parse(entity.loaders)
            // let loader: any = {
            //     id: newLoaderId,
            //     loaderId: data.loaderId,
            //     loaderName: data.loaderName,
            //     loaderConfig: data.loaderConfig,
            //     splitterId: data.splitterId,
            //     splitterName: data.splitterName,
            //     splitterConfig: data.splitterConfig
            // }
            // if (data.credential) {
            //     loader.credential = data.credential
            // }
            const loader = existingLoaders.find((ldr: any) => ldr.id === newLoaderId)
            if (filesWithMetadata.length > 0) {
                loader.files = filesWithMetadata
            }
            //existingLoaders.push(loader)
            if (data.id) {
                //step 5: remove all files and chunks associated with the previous loader
                const index = existingLoaders.indexOf(loader)
                if (index > -1) {
                    existingLoaders.splice(index, 1)
                    if (!data.rehydrated) {
                        if (loader.files) {
                            loader.files.map((file: any) => {
                                fs.unlinkSync(file.path)
                            })
                        }
                    }
                }
            }
            //step 7: remove all previous chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: newLoaderId })
            if (response.chunks) {
                //step 8: now save the new chunks
                const totalChars = response.chunks.reduce((acc: number, chunk: any) => acc + chunk.pageContent.length, 0)
                response.chunks.map(async (chunk: any) => {
                    const docChunk: DocumentStoreFileChunk = {
                        docId: newLoaderId,
                        storeId: data.storeId,
                        id: uuidv4(),
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
            const allSynced = existingLoaders.every((ldr: any) => ldr.status === 'SYNC')
            entity.status = allSynced ? DocumentStoreStatus.SYNC : DocumentStoreStatus.STALE
            entity.loaders = JSON.stringify(existingLoaders)
            //step 9: update the entity in the database
            await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return
        })
    } catch (error) {
        throw new Error(`Error: documentStoreServices._saveChunksToStorage - ${error}`)
    }
}

// Get all component nodes
const getDocumentLoaders = async () => {
    const removeDocumentLoadersWithName = ['documentStore', 'vectorStoreToDocument', 'unstructuredFolderLoader', 'folderFiles']

    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Document Loaders')
        return dbResponse.filter((node) => !removeDocumentLoadersWithName.includes(node.name))
    } catch (error) {
        throw new Error(`Error: documentStoreServices.getDocumentLoaders - ${error}`)
    }
}

export default {
    createDocumentStore,
    deleteLoaderFromDocumentStore,
    getAllDocumentStores,
    getDocumentStoreById,
    getDocumentStoreFileChunks,
    updateDocumentStore,
    previewChunks,
    processAndSaveChunks,
    getDocumentLoaders,
    deleteDocumentStoreFileChunk,
    editDocumentStoreFileChunk
}
