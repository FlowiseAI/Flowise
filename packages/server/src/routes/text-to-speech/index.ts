import express from 'express'
import textToSpeechController from '../../controllers/text-to-speech'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

router.post('/generate', textToSpeechController.generateTextToSpeech)

router.post('/abort', textToSpeechController.abortTextToSpeech)

router.get('/voices', checkAnyPermission('chatflows:config,agentflows:config'), textToSpeechController.getVoices)

export default router
