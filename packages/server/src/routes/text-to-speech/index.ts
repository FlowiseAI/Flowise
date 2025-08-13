import express from 'express'
import textToSpeechController from '../../controllers/text-to-speech'

const router = express.Router()

router.post('/generate', textToSpeechController.generateTextToSpeech)

router.get('/voices', textToSpeechController.getVoices)

export default router
