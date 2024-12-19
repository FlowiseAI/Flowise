import express from 'express'
import multer from 'multer'
import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getUploadPath } from '../../utils'

const router = express.Router()
const upload = multer({ dest: getUploadPath() })

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
router.post('/:id', upload.array('files'), openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore)

// DELETE
router.patch(['/', '/:id'], openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore)

export default router
