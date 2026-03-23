import express from 'express'
import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getMulterStorage } from '../../utils'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CREATE
router.post('/', checkPermission('assistants:create'), openaiAssistantsVectorStoreController.createAssistantVectorStore)

// READ
router.get('/:id', checkPermission('assistants:view'), openaiAssistantsVectorStoreController.getAssistantVectorStore)

// LIST
router.get('/', checkPermission('assistants:view'), openaiAssistantsVectorStoreController.listAssistantVectorStore)

// UPDATE
router.put(
    ['/', '/:id'],
    checkAnyPermission('assistants:create,assistants:update'),
    openaiAssistantsVectorStoreController.updateAssistantVectorStore
)

// DELETE
router.delete(['/', '/:id'], checkPermission('assistants:delete'), openaiAssistantsVectorStoreController.deleteAssistantVectorStore)

// UPLOAD FILES — permission check must precede multer to reject unauthorized requests before file parsing
router.post(
    '/:id',
    checkAnyPermission('assistants:create,assistants:update'),
    getMulterStorage().array('files'),
    openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore
)

// DELETE FILES
router.patch(['/', '/:id'], checkPermission('assistants:update'), openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore)

export default router
