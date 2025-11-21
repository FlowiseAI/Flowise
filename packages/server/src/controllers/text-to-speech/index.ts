import { NextFunction, Request, Response } from 'express'
import { convertTextToSpeechStream } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import chatflowsService from '../../services/chatflows'
import textToSpeechService from '../../services/text-to-speech'
import { databaseEntities } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const generateTextToSpeech = async (req: Request, res: Response) => {
    try {
        const {
            chatId,
            chatflowId,
            chatMessageId,
            text,
            provider: bodyProvider,
            credentialId: bodyCredentialId,
            voice: bodyVoice,
            model: bodyModel
        } = req.body

        if (!text) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.generateTextToSpeech - text not provided!`
            )
        }

        let provider: string, credentialId: string, voice: string, model: string

        if (chatflowId) {
            const workspaceId = req.user?.activeWorkspaceId
            if (!workspaceId) {
                throw new InternalFlowiseError(
                    StatusCodes.NOT_FOUND,
                    `Error: textToSpeechController.generateTextToSpeech - workspace ${workspaceId} not found!`
                )
            }
            // Get TTS config from chatflow
            const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
            const ttsConfig = JSON.parse(chatflow.textToSpeech)

            // Find the provider with status: true
            const activeProviderKey = Object.keys(ttsConfig).find((key) => ttsConfig[key].status === true)
            if (!activeProviderKey) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Error: textToSpeechController.generateTextToSpeech - no active TTS provider configured in chatflow!`
                )
            }

            const providerConfig = ttsConfig[activeProviderKey]
            provider = activeProviderKey
            credentialId = providerConfig.credentialId
            voice = providerConfig.voice
            model = providerConfig.model
        } else {
            // Use TTS config from request body
            provider = bodyProvider
            credentialId = bodyCredentialId
            voice = bodyVoice
            model = bodyModel
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

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control')

        const appServer = getRunningExpressApp()
        const options = {
            orgId: '',
            chatflowid: chatflowId || '',
            chatId: chatId || '',
            appDataSource: appServer.AppDataSource,
            databaseEntities: databaseEntities
        }

        const textToSpeechConfig = {
            name: provider,
            credentialId: credentialId,
            voice: voice,
            model: model
        }

        // Create and store AbortController
        const abortController = new AbortController()
        const ttsAbortId = `tts_${chatId}_${chatMessageId}`
        appServer.abortControllerPool.add(ttsAbortId, abortController)

        try {
            await convertTextToSpeechStream(
                text,
                textToSpeechConfig,
                options,
                abortController,
                (format: string) => {
                    const startResponse = {
                        event: 'tts_start',
                        data: { chatMessageId, format }
                    }
                    res.write('event: tts_start\n')
                    res.write(`data: ${JSON.stringify(startResponse)}\n\n`)
                },
                (chunk: Buffer) => {
                    const audioBase64 = chunk.toString('base64')
                    const clientResponse = {
                        event: 'tts_data',
                        data: { chatMessageId, audioChunk: audioBase64 }
                    }
                    res.write('event: tts_data\n')
                    res.write(`data: ${JSON.stringify(clientResponse)}\n\n`)
                },
                async () => {
                    const endResponse = {
                        event: 'tts_end',
                        data: { chatMessageId }
                    }
                    res.write('event: tts_end\n')
                    res.write(`data: ${JSON.stringify(endResponse)}\n\n`)
                    res.end()
                    // Clean up from pool on successful completion
                    appServer.abortControllerPool.remove(ttsAbortId)
                }
            )
        } catch (error) {
            // Clean up from pool on error
            appServer.abortControllerPool.remove(ttsAbortId)
            throw error
        }
    } catch (error) {
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
        }

        const errorResponse = {
            event: 'tts_error',
            data: { error: error instanceof Error ? error.message : 'TTS generation failed' }
        }
        res.write('event: tts_error\n')
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`)
        res.end()
    }
}

const abortTextToSpeech = async (req: Request, res: Response) => {
    try {
        const { chatId, chatMessageId, chatflowId } = req.body

        if (!chatId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.abortTextToSpeech - chatId not provided!`
            )
        }

        if (!chatMessageId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.abortTextToSpeech - chatMessageId not provided!`
            )
        }

        if (!chatflowId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: textToSpeechController.abortTextToSpeech - chatflowId not provided!`
            )
        }

        const appServer = getRunningExpressApp()

        // Abort the TTS generation using existing pool
        const ttsAbortId = `tts_${chatId}_${chatMessageId}`
        appServer.abortControllerPool.abort(ttsAbortId)

        // Also abort the main chat flow AbortController for auto-TTS
        const chatFlowAbortId = `${chatflowId}_${chatId}`
        if (appServer.abortControllerPool.get(chatFlowAbortId)) {
            appServer.abortControllerPool.abort(chatFlowAbortId)
            appServer.sseStreamer.streamMetadataEvent(chatId, { chatId, chatMessageId })
        }

        // Send abort event to client
        appServer.sseStreamer.streamTTSAbortEvent(chatId, chatMessageId)

        res.json({ message: 'TTS stream aborted successfully', chatId, chatMessageId })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to abort TTS stream'
        })
    }
}

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
    abortTextToSpeech,
    getVoices
}
