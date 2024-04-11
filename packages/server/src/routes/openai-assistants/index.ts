import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
const router = express.Router()

// CREATE

// READ
router.get('/', openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], openaiAssistantsController.getSingleOpenaiAssistant)

// UPDATE

// DELETE

export default router
