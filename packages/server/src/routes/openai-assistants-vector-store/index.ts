import express from 'express'
import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getMulterStorage } from '../../utils'

const router = express.Router()

// CREATE
router.post('/', openaiAssistantsVectorStoreController.createAssistantVectorStore)

// READ
router.get('/:id', openaiAssistantsVectorStoreController.getAssistantVectorStore)

// LIST
router.get('/', openaiAssistantsVectorStoreController.listAssistantVectorStore)

// UPDATE
router.put(['/', '/:id'], openaiAssistantsVectorStoreController.updateAssistantVectorStore)

// DELETE
router.delete(['/', '/:id'], openaiAssistantsVectorStoreController.deleteAssistantVectorStore)

// POST
router.post('/:id', getMulterStorage().array('files'), openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore)

// DELETE
router.patch(['/', '/:id'], openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore)

export default router
