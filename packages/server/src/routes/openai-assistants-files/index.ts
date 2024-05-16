import express from 'express'
import multer from 'multer'
import path from 'path'
import openaiAssistantsController from '../../controllers/openai-assistants'

const router = express.Router()
const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

router.post('/download/', openaiAssistantsController.getFileFromAssistant)
router.post('/upload/', upload.array('files'), openaiAssistantsController.uploadAssistantFiles)

export default router
