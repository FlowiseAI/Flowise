import { Request, Response, NextFunction } from 'express'
import textToSpeechService from '../../services/text-to-speech'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

// Generate text-to-speech audio
const generateTextToSpeech = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text, provider, credentialId, voice, model } = req.body

        if (!text) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.generateTextToSpeech - text not provided!`
            )
        }

        if (!provider) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.generateTextToSpeech - provider not provided!`
            )
        }

        if (!credentialId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.generateTextToSpeech - credentialId not provided!`
            )
        }

        const response = await textToSpeechService.generateTextToSpeech({
            text,
            provider,
            credentialId,
            voice,
            model
        })

        res.setHeader('Content-Type', response.contentType)
        res.setHeader('Content-Length', response.audioBuffer.length)
        res.setHeader('Cache-Control', 'public, max-age=3600')

        return res.send(response.audioBuffer)
    } catch (error) {
        next(error)
    }
}

// Get available voices for a provider
const getVoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { provider, credentialId } = req.query

        if (!provider) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: textToSpeechController.getVoices - provider not provided!`)
        }

        const voices = await textToSpeechService.getVoices(provider as any, credentialId as string)

        return res.json(voices)
    } catch (error) {
        next(error)
    }
}

export default {
    generateTextToSpeech,
    getVoices
}
