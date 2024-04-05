import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { DocumentStore } from '../../database/entities/DocumentStore'
// @ts-ignore
import { DocumentStoreProcessor, getStoragePath } from 'flowise-components'
import fs from 'fs'
import path from 'path'
import { DocumentStoreStatus } from '../../Interface'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { v4 as uuidv4 } from 'uuid'

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

const deleteFileFromDocumentStore = async (storeId: string, fileId: string) => {
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
        const existingFiles = JSON.parse(entity.files)
        const found = existingFiles.find((uFile: any) => uFile.id === fileId)
        const metrics = JSON.parse(entity.metrics)
        if (found) {
            //remove the existing file
            fs.unlinkSync(found.path)
            const index = existingFiles.indexOf(found)
            if (index > -1) {
                existingFiles.splice(index, 1)
            }
            metrics.totalFiles--
            metrics.totalChunks -= found.totalChunks
            metrics.totalChars -= found.totalChars
            entity.status = DocumentStoreStatus.SYNC

            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

            entity.files = JSON.stringify(existingFiles)
            entity.metrics = JSON.stringify(metrics)
            await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        } else {
            throw new Error(`Unable to locate file in Document Store ${entity.name}`)
        }
    } catch (error) {
        throw new Error(`Error: documentStoreServices.deleteFileFromDocumentStore - ${error}`)
    }
}

const uploadFileToDocumentStore = async (storeId: string, uploadFiles: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        // Base64 strings
        let files: string[] = []
        const fileBase64 = uploadFiles
        if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
            files = JSON.parse(fileBase64)
        } else {
            files = [fileBase64]
        }

        const dir = path.join(getStoragePath(), 'datasource', entity.subFolder)
        if (!fs.existsSync(dir)) {
            throw new Error(`Missing folder to upload files for Document Store ${entity.name}`)
        }
        const filesWithMetadata: any[] = []
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI.pop()?.split(':')[1] ?? ''
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const filePath = path.join(dir, filename)
            fs.writeFileSync(filePath, bf)
            const stats = fs.statSync(filePath)
            filesWithMetadata.push({
                id: uuidv4(),
                path: filePath,
                name: filename,
                size: stats.size,
                status: DocumentStoreStatus.NEW,
                uploaded: stats.birthtime,
                totalChunks: 0,
                totalChars: 0
            })
        }
        const existingFiles = JSON.parse(entity.files)
        existingFiles.map((file: any) => {
            //check if they have uploaded a file with the same as an existing file
            const found = files.find((uFile: any) => uFile.name === file.name)
            if (found) {
                //remove the existing file
                const index = existingFiles.indexOf(file)
                if (index > -1) {
                    existingFiles.splice(index, 1)
                }
            }
        })
        existingFiles.push(...filesWithMetadata)
        entity.status = DocumentStoreStatus.STALE
        entity.files = JSON.stringify(existingFiles)
        const results = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return results
        //start processing the files in the background
        // const documentProcessor = new DocumentStoreProcessor()
        // let config = JSON.parse(entity.config)
        // documentProcessor.splitIntoChunks(entity.id, config, filesWithMetadata).then(async (result: any) => {
        //     if (result.uploadedFiles && result.uploadedFiles.length) {
        //         const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
        //             id: result.id
        //         })
        //         if (!entity) throw new Error(`Document store ${storeId} not found`)
        //         entity.status = DocumentStoreStatus.SYNC
        //         const files = JSON.parse(entity.files)
        //         const metrics = JSON.parse(entity.metrics)
        //         const filesWithChunks = files.map((file: any) => {
        //             const found = result.uploadedFiles.find((uFile: any) => uFile.id === file.id)
        //             let totalNewChars = 0
        //             if (found) {
        //                 file.totalChunks = found.totalChunks
        //                 file.status = 'SYNC'
        //                 if (found.chunks) {
        //                     found.chunks.map(async (chunk: any) => {
        //                         const docChunk: DocumentStoreFileChunk = {
        //                             docId: file.id,
        //                             storeId: result.id,
        //                             id: uuidv4(),
        //                             pageContent: chunk.pageContent,
        //                             metadata: JSON.stringify(chunk.metadata)
        //                         }
        //                         totalNewChars += chunk.pageContent.length
        //                         const dChunk = appServer.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
        //                         await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
        //                     })
        //                     file.totalChars = totalNewChars
        //                 }
        //                 metrics.totalChunks += file.totalChunks
        //                 metrics.totalChars += totalNewChars
        //                 metrics.totalFiles++
        //             }
        //             return file
        //         })
        //         entity.metrics = JSON.stringify(metrics)
        //         entity.files = JSON.stringify(filesWithChunks)
        //         await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        //     }
        // })
    } catch (error) {
        throw new Error(`Error: documentStoreServices.uploadFileToDocumentStore - ${error}`)
    }
}

const previewChunks = async (storeId: string, fileId: string, config: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const files = JSON.parse(entity.files)
        const found = files.find((file: any) => file.id === fileId)
        if (!found) throw new Error(`Document store file ${fileId} not found`)
        const documentProcessor = new DocumentStoreProcessor()
        const chunksObj = await documentProcessor.split(config, found)
        return chunksObj
    } catch (error) {
        throw new Error(`Error: documentStoreServices.previewChunks - ${error}`)
    }
}

const processChunks = async (storeId: string, fileId: string, config: string) => {
    try {
        const chunksObj: any = await previewChunks(storeId, fileId, config)
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        entity.status = DocumentStoreStatus.SYNC
        const files = JSON.parse(entity.files)
        const metrics = JSON.parse(entity.metrics)
        const found = files.find((uFile: any) => uFile.id === fileId)
        let totalNewChars = 0
        if (found) {
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

            found.totalChunks = chunksObj.totalChunks
            found.status = 'SYNC'
            found.config = JSON.stringify(config)
            metrics.totalChunks -= found.totalChunks
            if (chunksObj.chunks) {
                chunksObj.chunks.map(async (chunk: any) => {
                    const docChunk: DocumentStoreFileChunk = {
                        docId: fileId,
                        storeId: storeId,
                        id: uuidv4(),
                        pageContent: chunk.pageContent,
                        metadata: JSON.stringify(chunk.metadata)
                    }
                    totalNewChars += chunk.pageContent.length
                    const dChunk = appServer.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
                    await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
                })
                found.totalChars = totalNewChars
            }
            metrics.totalChunks += found.totalChunks
            metrics.totalChars += totalNewChars
            metrics.totalFiles++
        }
        entity.metrics = JSON.stringify(metrics)
        entity.files = JSON.stringify(files)
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return getDocumentStoreFileChunks(storeId, fileId)
    } catch (error) {
        throw new Error(`Error: documentStoreServices.previewChunks - ${error}`)
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
const getDocumentStoreFileChunks = async (storeId: string, fileId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) throw new Error(`Document store ${storeId} not found`)
        const files = JSON.parse(entity.files)
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

export default {
    createDocumentStore,
    deleteFileFromDocumentStore,
    getAllDocumentStores,
    getDocumentStoreById,
    getDocumentStoreFileChunks,
    updateDocumentStore,
    uploadFileToDocumentStore,
    previewChunks,
    processChunks
}
