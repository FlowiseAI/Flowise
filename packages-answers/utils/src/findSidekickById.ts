import { parseChatbotConfig, parseFlowData } from './normalizeSidekick'
import { User } from 'types'
import auth0 from '@utils/auth/auth0'
import { INodeParams } from '@flowise/components'

export async function findSidekickById(user: User, id: string) {
    let token
    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')
        token = accessToken
    } catch (err) {
        throw new Error('Unauthorized')
    }

    const response = await fetch(`${user.chatflowDomain}/api/v1/chatflows/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    })

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized')
        if (response.status === 404) throw new Error('NotFound')
        throw new Error('Failed to fetch sidekick')
    }

    const chatflow = await response.json()

    const uploadAllowedNodes = [
        'llmChain',
        'conversationChain',
        'reactAgentChat',
        'conversationalAgent',
        'toolAgent',
        'supervisor',
        'seqStart'
    ]
    const uploadProcessingNodes = ['chatOpenAI', 'chatAnthropic', 'awsChatBedrock', 'azureChatOpenAI', 'chatGoogleGenerativeAI']

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

    const flowData = parseFlowData(chatflow.flowData)
    const nodes = flowData.nodes || []
    const imgUploadSizeAndTypes: any[] = []
    let isImageUploadAllowed = false

    if (nodes.some((node) => uploadAllowedNodes.includes(node.data.name))) {
        nodes.forEach((node) => {
            if (uploadProcessingNodes.includes(node.data.name)) {
                node.data.inputParams.forEach((param: INodeParams) => {
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

    const categories = (chatflow.categories || chatflow.category ? [chatflow.category] : [])
        .filter(Boolean)
        .map((c: string) => c.trim().split(';'))
        .flat()

    return {
        id: chatflow.id || '',
        label: chatflow.name || '',
        visibility: chatflow.visibility || [],
        chatflow,
        answersConfig: chatflow.answersConfig,
        chatflowId: chatflow.id || '',
        chatflowDomain: user.chatflowDomain,
        chatbotConfig: parseChatbotConfig(chatflow.chatbotConfig),
        flowData: parseFlowData(chatflow.flowData),
        category: chatflow.category,
        categories,
        isAvailable: chatflow.isPublic || chatflow.visibility.includes('Organization'),
        isFavorite: false,
        constraints: {
            isSpeechToTextEnabled,
            isImageUploadAllowed,
            uploadSizeAndTypes: [...imgUploadSizeAndTypes, { fileTypes: ['audio/mpeg', 'audio/wav', 'audio/webm'], maxUploadSize: 10 }]
        }
    }
}
