import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getVoices } from 'flowise-components'
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

const getVoicesForProvider = async (provider: string, credentialId?: string): Promise<any[]> => {
    try {
        if (!credentialId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Credential ID required for this provider')
        }

        const appServer = getRunningExpressApp()
        const options = {
            orgId: '',
            chatflowid: '',
            chatId: '',
            appDataSource: appServer.AppDataSource,
            databaseEntities: databaseEntities
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
    getVoices: getVoicesForProvider
}
