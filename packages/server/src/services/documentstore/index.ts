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
        const metrics = JSON.parse(entity.metrics)
        if (found) {
            if (found.path) {
                //remove the existing files, if any of the file loaders were used.
                fs.unlinkSync(found.path)
                metrics.totalFiles--
            }
            const index = existingLoaders.indexOf(found)
            if (index > -1) {
                existingLoaders.splice(index, 1)
            }
            metrics.totalChunks -= found.totalChunks ?? 0
            metrics.totalChars -= found.totalChars ?? 0
            // remove the chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

            entity.loaders = JSON.stringify(existingLoaders)
            entity.metrics = JSON.stringify(metrics)
            const results = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return results
        } else {
            throw new Error(`Unable to locate loader in Document Store ${entity.name}`)
        }
    } catch (error) {
        throw new Error(`Error: documentStoreServices.deleteLoaderFromDocumentStore - ${error}`)
    }
}

// const uploadFileToDocumentStore = async (storeId: string, uploadFiles: string) => {
//     try {
//         const appServer = getRunningExpressApp()
//         const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
//             id: storeId
//         })
//         if (!entity) throw new Error(`Document store ${storeId} not found`)
//         // Base64 strings
//         let files: string[] = []
//         const fileBase64 = uploadFiles
//         if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
//             files = JSON.parse(fileBase64)
//         } else {
//             files = [fileBase64]
//         }
//
//         const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
//         if (!fs.existsSync(dir)) {
//             throw new Error(`Missing folder to upload files for Document Store ${entity.name}`)
//         }
//         const filesWithMetadata: any[] = []
//         for (const file of files) {
//             const splitDataURI = file.split(',')
//             const filename = splitDataURI.pop()?.split(':')[1] ?? ''
//             const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
//             const filePath = path.join(dir, filename)
//             fs.writeFileSync(filePath, bf)
//             const stats = fs.statSync(filePath)
//             filesWithMetadata.push({
//                 id: uuidv4(),
//                 path: filePath,
//                 name: filename,
//                 size: stats.size,
//                 status: DocumentStoreStatus.NEW,
//                 uploaded: stats.birthtime,
//                 totalChunks: 0,
//                 totalChars: 0
//             })
//         }
//         const existingFiles = JSON.parse(entity.files)
//         existingFiles.map((file: any) => {
//             //check if they have uploaded a file with the same as an existing file
//             const found = files.find((uFile: any) => uFile.name === file.name)
//             if (found) {
//                 //remove the existing file
//                 const index = existingFiles.indexOf(file)
//                 if (index > -1) {
//                     existingFiles.splice(index, 1)
//                 }
//             }
//         })
//         const metrics = JSON.parse(entity.metrics)
//         metrics.totalFiles += filesWithMetadata.length
//         entity.metrics = JSON.stringify(metrics)
//         existingFiles.push(...filesWithMetadata)
//         entity.status = DocumentStoreStatus.STALE
//         entity.files = JSON.stringify(existingFiles)
//         const results = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
//         return results
//     } catch (error) {
//         throw new Error(`Error: documentStoreServices.uploadFileToDocumentStore - ${error}`)
//     }
// }

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
const getDocumentStoreFileChunks = async (storeId: string, fileId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const files = JSON.parse(entity.loaders)
        const found = files.find((file: any) => file.id === fileId)
        if (!found) throw new Error(`Document store file ${fileId} not found`)

        const chunksWithCount = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findAndCount({
            where: { docId: fileId }
        })

        if (!chunksWithCount) throw new Error(`File ${fileId} not found`)
        found.storeName = entity.name
        return {
            chunks: chunksWithCount[0],
            count: chunksWithCount[1],
            file: found
        }
    } catch (error) {
        throw new Error(`Error: documentStoreServices.getDocumentStoreFileChunks - ${error}`)
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
    // const filesWithMetadata: any[] = []
    // for (const file of files) {
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
        }
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        console.log('processAndSaveChunks - delegate')
        // this method will run async, will have to be moved to a worker thread
        _saveChunksToStorage(data, entity, newLoaderId).then(() => {})
        return getDocumentStoreFileChunks(data.storeId, newLoaderId)
    } catch (error) {
        throw new Error(`Error: documentStoreServices.processChunks - ${error}`)
    }
}

const _saveChunksToStorage = async (data: any, entity: DocumentStore, newLoaderId: string) => {
    const re = new RegExp('^data.*;base64', 'i')

    try {
        const appServer = getRunningExpressApp()
        console.log('_saveChunksToStorage - before preview')
        //step 1: restore the full paths, if any
        await _normalizeFilePaths(data, entity)
        //step 2: split the file into chunks
        previewChunks(data).then(async (response) => {
            //{ chunks: docs, totalChunks: totalChunks, previewChunkCount: data.previewChunkCount }
            console.log('_saveChunksToStorage - after preview')

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
            let loader: any = {
                id: newLoaderId,
                loaderId: data.loaderId,
                loaderName: data.loaderName,
                loaderConfig: data.loaderConfig,
                splitterId: data.splitterId,
                splitterName: data.splitterName,
                splitterConfig: data.splitterConfig
            }
            if (data.credential) {
                loader.credential = data.credential
            }
            if (filesWithMetadata.length > 0) {
                loader.files = filesWithMetadata
            }
            existingLoaders.push(loader)
            const metrics = JSON.parse(entity.metrics)
            if (data.id) {
                //step 5: remove all files and chunks associated with the previous loader
                const found = existingLoaders.find((ldr: any) => ldr.id === data.id)
                if (found) {
                    const index = existingLoaders.indexOf(found)
                    if (index > -1) {
                        metrics.totalChunks -= found.totalChunks
                        metrics.totalChars -= found.totalChars
                        existingLoaders.splice(index, 1)
                        if (!data.rehydrated) {
                            if (found.files) {
                                metrics.totalFiles -= found.files.length
                                found.files.map((file: any) => {
                                    fs.unlinkSync(file.path)
                                })
                            }
                        }
                    }
                }
            }
            if (!data.rehydrated) {
                metrics.totalFiles += filesWithMetadata.length
            }
            //step 6: update metrics and status
            entity.status = DocumentStoreStatus.STALE
            metrics.totalChunks += response.totalChunks
            const totalChars = response.chunks.reduce((acc: number, chunk: any) => acc + chunk.pageContent.length, 0)
            metrics.totalChars += totalChars
            const found = existingLoaders.find((ldr: any) => ldr.id === newLoaderId)
            //step 7: remove all previous chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: newLoaderId })
            if (response.chunks) {
                //step 8: now save the new chunks
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
                found.totalChunks = response.totalChunks
                found.totalChars = totalChars
            }
            found.status = 'SYNC'
            entity.metrics = JSON.stringify(metrics)
            entity.loaders = JSON.stringify(existingLoaders)
            //step 8: update the entity in the database
            await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return
        })
    } catch (error) {
        throw new Error(`Error: documentStoreServices._saveChunksToStorage - ${error}`)
    }
}

export default {
    createDocumentStore,
    deleteLoaderFromDocumentStore,
    getAllDocumentStores,
    getDocumentStoreById,
    getDocumentStoreFileChunks,
    updateDocumentStore,
    //uploadFileToDocumentStore,
    previewChunks,
    processAndSaveChunks
}
