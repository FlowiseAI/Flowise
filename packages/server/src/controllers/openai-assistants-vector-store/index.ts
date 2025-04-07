import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import openAIAssistantVectorStoreService from '../../services/openai-assistants-vector-store'

const getAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.getAssistantVectorStore - id not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.getAssistantVectorStore - credential not provided!`
            )
        }
        const apiResponse = await openAIAssistantVectorStoreService.getAssistantVectorStore(req.query.credential as string, req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const listAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.listAssistantVectorStore - credential not provided!`
            )
        }
        const apiResponse = await openAIAssistantVectorStoreService.listAssistantVectorStore(req.query.credential as string)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.createAssistantVectorStore - body not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.createAssistantVectorStore - credential not provided!`
            )
        }
        const apiResponse = await openAIAssistantVectorStoreService.createAssistantVectorStore(req.query.credential as string, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.updateAssistantVectorStore - id not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.updateAssistantVectorStore - credential not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.updateAssistantVectorStore - body not provided!`
            )
        }
        const apiResponse = await openAIAssistantVectorStoreService.updateAssistantVectorStore(
            req.query.credential as string,
            req.params.id,
            req.body
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.deleteAssistantVectorStore - id not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.updateAssistantVectorStore - credential not provided!`
            )
        }
        const apiResponse = await openAIAssistantVectorStoreService.deleteAssistantVectorStore(
            req.query.credential as string,
            req.params.id as string
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const uploadFilesToAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore - id not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore - credential not provided!`
            )
        }
        const files = req.files ?? []
        const uploadFiles: { filePath: string; fileName: string }[] = []

        if (Array.isArray(files)) {
            for (const file of files) {
                // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
                file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
                uploadFiles.push({
                    filePath: file.path ?? file.key,
                    fileName: file.originalname
                })
            }
        }

        const apiResponse = await openAIAssistantVectorStoreService.uploadFilesToAssistantVectorStore(
            req.query.credential as string,
            req.params.id as string,
            uploadFiles
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteFilesFromAssistantVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore - id not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.credential) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore - credential not provided!`
            )
        }

        const apiResponse = await openAIAssistantVectorStoreService.deleteFilesFromAssistantVectorStore(
            req.query.credential as string,
            req.params.id as string,
            req.body.file_ids
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
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
