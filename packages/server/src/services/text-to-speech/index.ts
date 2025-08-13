import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { convertTextToSpeech, getVoices } from 'flowise-components'
import { databaseEntities } from '../../utils'

export enum TextToSpeechProvider {
    OPENAI = 'openai',
    ELEVEN_LABS = 'elevenlabs'
}

export interface TTSRequest {
    text: string
    provider: TextToSpeechProvider
    credentialId: string
    voice?: string
    model?: string
}

export interface TTSResponse {
    audioBuffer: Buffer
    contentType: string
}

const generateTextToSpeech = async (request: TTSRequest): Promise<TTSResponse> => {
    try {
        const appServer = getRunningExpressApp()
        const options = {
            orgId: '',
            chatflowid: '',
            chatId: '',
            appDataSource: appServer.AppDataSource,
            databaseEntities: databaseEntities
        }

        const textToSpeechConfig = {
            name: request.provider,
            credentialId: request.credentialId,
            voice: request.voice,
            model: request.model
        }

        const audioBuffer = await convertTextToSpeech(request.text, textToSpeechConfig, options)

        return {
            audioBuffer,
            contentType: 'audio/mpeg'
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: textToSpeechService.generateTextToSpeech - ${getErrorMessage(error)}`
        )
    }
}

const getVoicesForProvider = async (provider: string, credentialId?: string): Promise<any[]> => {
    try {
        if (provider === TextToSpeechProvider.OPENAI) {
            return [
                { id: 'alloy', name: 'Alloy' },
                { id: 'echo', name: 'Echo' },
                { id: 'fable', name: 'Fable' },
                { id: 'onyx', name: 'Onyx' },
                { id: 'nova', name: 'Nova' },
                { id: 'shimmer', name: 'Shimmer' }
            ]
        }

        if (!credentialId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Credential ID required for this provider')
        }

        const appServer = getRunningExpressApp()
        const options = {
            orgId: '',
            chatflowid: '',
            chatId: '',
            appDataSource: appServer.AppDataSource,
            databaseEntities: {}
        }

        return await getVoices(provider, credentialId, options)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: textToSpeechService.getVoices - ${getErrorMessage(error)}`
        )
    }
}

export default {
    generateTextToSpeech,
    getVoices: getVoicesForProvider
}
