import { DocumentStoreDTO } from '../../dto/DocumentStoreDTO'
// @ts-ignore
import { getStoragePath } from 'flowise-components'
import fs from 'fs'
import path from 'path'
import { NextFunction, Request, Response } from 'express'
import { convertToValidFilename } from '../../utils'
import documentStoreService from '../../services/documentstore'
import { DocumentStore } from '../../database/entities/DocumentStore'

const createDocumentStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error(`Error: documentStoreController.createDocumentStore - body not provided!`)
        }
        const body = req.body
        const subFolder = convertToValidFilename(body.name)
        const dir = path.join(getStoragePath(), 'datasource', subFolder)
        if (fs.existsSync(dir)) {
            return res.status(500).send(new Error(`Document store ${body.name} already exists. Subfolder: ${subFolder}`))
        } else {
            fs.mkdirSync(dir, { recursive: true })
        }
        const docStore = DocumentStoreDTO.toEntity(body)
        const apiResponse = await documentStoreService.createDocumentStore(docStore)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
const getAllDocumentStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await documentStoreService.getAllDocumentStores()
        return res.json(DocumentStoreDTO.fromEntities(apiResponse))
    } catch (error) {
        next(error)
    }
}
const deleteFileFromDocumentStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const storeId = req.params.id
        const fileId = req.params.fileId

        if (!storeId || !fileId) {
            return res.status(500).send(new Error(`Document store file delete missing key information.`))
        }
        const apiResponse = await documentStoreService.deleteFileFromDocumentStore(storeId, fileId)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

// const uploadFileToDocumentStore = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const body = req.body
//         if (!req.params.id || !body.uploadFiles) {
//             return res.status(500).send(new Error(`Document store upload missing key information.`))
//         }
//
//         const apiResponse = await documentStoreService.uploadFileToDocumentStore(body.storeId, body.uploadFiles)
//         return res.json(DocumentStoreDTO.fromEntity(apiResponse))
//     } catch (error) {
//         next(error)
//     }
// }

const getDocumentStoreById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: documentStoreController.getDocumentStoreById - id not provided!')
        }

        const apiResponse = await documentStoreService.getDocumentStoreById(req.params.id)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const getDocumentStoreFileChunks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.storeId === 'undefined' || req.params.storeId === '') {
            throw new Error('Error: documentStoreController.getDocumentStoreFileChunks - storeId not provided!')
        }
        if (typeof req.params.fileId === 'undefined' || req.params.fileId === '') {
            throw new Error('Error: documentStoreController.getDocumentStoreFileChunks - fileId not provided!')
        }

        const apiResponse = await documentStoreService.getDocumentStoreFileChunks(req.params.storeId, req.params.fileId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const processFileChunks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.processChunksWithLoader - body not provided!')
        }
        const body = req.body
        const apiResponse = await documentStoreService.processAndSaveChunks(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateDocumentStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: documentStoreController.updateDocumentStore - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.updateDocumentStore - body not provided!')
        }
        const store = await documentStoreService.getDocumentStoreById(req.params.id)
        if (!store) {
            return res.status(404).send(`DocumentStore ${req.params.id} not found in the database`)
        }
        const body = req.body
        const updateDocStore = new DocumentStore()
        Object.assign(updateDocStore, body)
        const apiResponse = await documentStoreService.updateDocumentStore(store, updateDocStore)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const previewFileChunks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.processChunksWithLoader - body not provided!')
        }
        const body = req.body
        const apiResponse = await documentStoreService.previewChunks(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createDocumentStore,
    getAllDocumentStores,
    deleteFileFromDocumentStore,
    getDocumentStoreById,
    getDocumentStoreFileChunks,
    // uploadFileToDocumentStore,
    updateDocumentStore,
    processFileChunks,
    previewFileChunks
}
