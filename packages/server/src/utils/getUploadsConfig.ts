import { StatusCodes } from 'http-status-codes'
import { INodeParams } from 'flowise-components'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { IUploadFileSizeAndTypes, IReactFlowNode, IReactFlowEdge } from '../Interface'
import { InternalFlowiseError } from '../errors/internalFlowiseError'

type IUploadConfig = {
    isSpeechToTextEnabled: boolean
    isImageUploadAllowed: boolean
    isRAGFileUploadAllowed: boolean
    imgUploadSizeAndTypes: IUploadFileSizeAndTypes[]
    fileUploadSizeAndTypes: IUploadFileSizeAndTypes[]
}

/**
 * Method that checks if uploads are enabled in the chatflow
 * @param {string} chatflowid
 */
export const utilGetUploadsConfig = async (chatflowid: string): Promise<IUploadConfig> => {
    const appServer = getRunningExpressApp()
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    const flowObj = JSON.parse(chatflow.flowData)
    const nodes: IReactFlowNode[] = flowObj.nodes
    const edges: IReactFlowEdge[] = flowObj.edges

    let isSpeechToTextEnabled = false
    let isImageUploadAllowed = false
    let isRAGFileUploadAllowed = false

    /*
     * Check for STT
     */
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

    /*
     * Condition for isRAGFileUploadAllowed
     * 1.) vector store with fileUpload = true && connected to a document loader with fileType
     */
    const fileUploadSizeAndTypes: IUploadFileSizeAndTypes[] = []
    for (const node of nodes) {
        if (node.data.category === 'Vector Stores' && node.data.inputs?.fileUpload) {
            // Get the connected document loader node fileTypes
            const sourceDocumentEdges = edges.filter(
                (edge) => edge.target === node.id && edge.targetHandle === `${node.id}-input-document-Document`
            )
            for (const edge of sourceDocumentEdges) {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                if (!sourceNode) continue
                const fileType = sourceNode.data.inputParams.find((param) => param.type === 'file' && param.fileType)?.fileType
                if (fileType) {
                    fileUploadSizeAndTypes.push({
                        fileTypes: fileType.split(', '),
                        maxUploadSize: 500
                    })
                    isRAGFileUploadAllowed = true
                }
            }
            break
        }
    }

    /*
     * Condition for isImageUploadAllowed
     * 1.) one of the imgUploadAllowedNodes exists
     * 2.) one of the imgUploadLLMNodes exists + allowImageUploads is ON
     */
    const imgUploadSizeAndTypes: IUploadFileSizeAndTypes[] = []
    const imgUploadAllowedNodes = [
        'llmChain',
        'conversationChain',
        'reactAgentChat',
        'conversationalAgent',
        'toolAgent',
        'supervisor',
        'seqStart'
    ]
    const imgUploadLLMNodes = ['chatOpenAI', 'chatAnthropic', 'awsChatBedrock', 'azureChatOpenAI', 'chatGoogleGenerativeAI', 'chatOllama']

    if (nodes.some((node) => imgUploadAllowedNodes.includes(node.data.name))) {
        nodes.forEach((node: IReactFlowNode) => {
            if (imgUploadLLMNodes.indexOf(node.data.name) > -1) {
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
    }

    return {
        isSpeechToTextEnabled,
        isImageUploadAllowed,
        isRAGFileUploadAllowed,
        imgUploadSizeAndTypes,
        fileUploadSizeAndTypes
    }
}
