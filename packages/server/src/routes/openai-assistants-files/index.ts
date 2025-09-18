import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
import { getMulterStorage } from '../../utils'

const router = express.Router()

router.post('/download/', openaiAssistantsController.getFileFromAssistant)
router.post('/upload/', getMulterStorage().array('files'), openaiAssistantsController.uploadAssistantFiles)

export default router
