import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
const router = express.Router()

// CREATE
router.post('/', openaiAssistantsController.getFileFromAssistant)

export default router
