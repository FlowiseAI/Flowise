import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CREATE

// READ
router.get('/', checkPermission('assistants:view'), openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], checkPermission('assistants:view'), openaiAssistantsController.getSingleOpenaiAssistant)

// UPDATE

// DELETE

export default router
