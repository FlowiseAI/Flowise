import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getVoices } from 'flowise-components'
import { databaseEntities } from '../../utils'
import credentialsService from '../credentials'

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

const getVoicesForProvider = async (provider: string, credentialId: string | undefined, workspaceId: string): Promise<any[]> => {
    try {
        if (!credentialId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Credential ID required for this provider')
        }

        await credentialsService.assertCredentialInWorkspace(credentialId, workspaceId)

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
