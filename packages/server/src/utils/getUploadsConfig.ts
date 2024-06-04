import { StatusCodes } from 'http-status-codes'
import { INodeParams } from 'flowise-components'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { IUploadFileSizeAndTypes, IReactFlowNode } from '../Interface'
import { InternalFlowiseError } from '../errors/internalFlowiseError'

/**
 * Method that checks if uploads are enabled in the chatflow
 * @param {string} chatflowid
 */
export const utilGetUploadsConfig = async (chatflowid: string): Promise<any> => {
    const appServer = getRunningExpressApp()
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    const uploadAllowedNodes = ['llmChain', 'conversationChain', 'reactAgentChat', 'conversationalAgent', 'toolAgent', 'supervisor']
    const uploadProcessingNodes = ['chatOpenAI', 'chatAnthropic', 'awsChatBedrock', 'azureChatOpenAI', 'chatGoogleGenerativeAI']

    const flowObj = JSON.parse(chatflow.flowData)
    const imgUploadSizeAndTypes: IUploadFileSizeAndTypes[] = []

    let isSpeechToTextEnabled = false
    if (chatflow.speechToText) {
        const speechToTextProviders = JSON.parse(chatflow.speechToText)
        for (const provider in speechToTextProviders) {
            if (provider !== 'none') {
                const providerObj = speechToTextProviders[provider]
                if (providerObj.status) {
                    isSpeechToTextEnabled = true
                    break
                }
            }
        }
    }

    let isImageUploadAllowed = false
    const nodes: IReactFlowNode[] = flowObj.nodes

    /*
     * Condition for isImageUploadAllowed
     * 1.) one of the uploadAllowedNodes exists
     * 2.) one of the uploadProcessingNodes exists + allowImageUploads is ON
     */
    if (!nodes.some((node) => uploadAllowedNodes.includes(node.data.name))) {
        return {
            isSpeechToTextEnabled,
            isImageUploadAllowed: false,
            imgUploadSizeAndTypes
        }
    }

    nodes.forEach((node: IReactFlowNode) => {
        if (uploadProcessingNodes.indexOf(node.data.name) > -1) {
            // TODO: for now the maxUploadSize is hardcoded to 5MB, we need to add it to the node properties
            node.data.inputParams.map((param: INodeParams) => {
                if (param.name === 'allowImageUploads' && node.data.inputs?.['allowImageUploads']) {
                    imgUploadSizeAndTypes.push({
                        fileTypes: 'image/gif;image/jpeg;image/png;image/webp;'.split(';'),
                        maxUploadSize: 5
                    })
                    isImageUploadAllowed = true
                }
            })
        }
    })
    return {
        isSpeechToTextEnabled,
        isImageUploadAllowed,
        imgUploadSizeAndTypes
    }
}
