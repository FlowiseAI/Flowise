import express from 'express'
import multer from 'multer'
import openaiAssistantsController from '../../controllers/openai-assistants'
import { getUploadPath } from '../../utils'

const router = express.Router()
const upload = multer({ dest: getUploadPath() })

router.post('/download/', openaiAssistantsController.getFileFromAssistant)
router.post('/upload/', upload.array('files'), openaiAssistantsController.uploadAssistantFiles)

export default router
