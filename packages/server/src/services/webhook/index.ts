import { StatusCodes } from 'http-status-codes'
import { IReactFlowObject } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowsService from '../chatflows'

const validateWebhookChatflow = async (chatflowId: string, workspaceId?: string, body?: Record<string, any>): Promise<void> => {
    try {
        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
        const startNode = parsedFlowData.nodes.find((node) => node.data.name === 'startAgentflow')
        const startInputType = startNode?.data?.inputs?.startInputType

        if (startInputType !== 'webhookTrigger') {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} is not configured as a webhook trigger`)
        }

        // Checks if any required params are not present and throw error if so
        const rawParams = startNode?.data?.inputs?.webhookBodyParams
        const webhookBodyParams: Array<{ name: string; required: boolean }> = Array.isArray(rawParams) ? rawParams : []
        const missingParams = webhookBodyParams.filter((p) => p.required && body?.[p.name] == null).map((p) => p.name)
        if (missingParams.length > 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Missing required webhook body parameters: ${missingParams.join(', ')}`)
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: webhookService.validateWebhookChatflow - ${getErrorMessage(error)}`
        )
    }
}

export default {
    validateWebhookChatflow
}
