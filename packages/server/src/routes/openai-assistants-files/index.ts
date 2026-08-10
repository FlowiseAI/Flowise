import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
import { getMulterStorage } from '../../utils'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

router.post('/download/', openaiAssistantsController.getFileFromAssistant)

// permission check must precede multer to reject unauthorized requests before file parsing
router.post(
    '/upload/',
    checkAnyPermission('assistants:create,assistants:update'),
    getMulterStorage().array('files'),
    openaiAssistantsController.uploadAssistantFiles
)

export default router
