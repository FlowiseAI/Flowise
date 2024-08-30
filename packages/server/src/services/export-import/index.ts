import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Credential } from '../../database/entities/Credential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getAll = async () => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowResponse = await appServer.AppDataSource.getRepository(ChatFlow).createQueryBuilder('chatFlow').getMany()
        const credentialResponse = await appServer.AppDataSource.getRepository(Credential).createQueryBuilder('credential').getMany()
        // let encryptionResponse = await appServer.AppDataSource.getRepository(Credential).createQueryBuilder('encryption').getMany()

        return { chatFlowResponse, credentialResponse }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: exportImportService.getAll - ${getErrorMessage(error)}`)
    }
}

export default {
    getAll
}
