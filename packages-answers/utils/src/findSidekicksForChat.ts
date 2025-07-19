import { parseChatbotConfig, parseFlowData } from './normalizeSidekick'
import { User } from 'types'
import { prisma } from '@db/client'
import auth0 from '@utils/auth/auth0'
import { INodeParams } from '@flowise/components'

interface Sidekick {
    id: string
    label: string
    visibility: string[]
    chatflow: any
    answersConfig: any
    chatflowId: string
    chatflowDomain: string
    chatbotConfig: any
    flowData: any
    isRecent: boolean
    category: string
    isAvailable: boolean
    isFavorite: boolean
    constraints: {
        isSpeechToTextEnabled: boolean
        isImageUploadAllowed: boolean
        uploadSizeAndTypes: {
            fileTypes: string[]
            maxUploadSize: number
        }[]
    }
}

interface FindSidekicksOptions {
    lightweight?: boolean
}

export async function findSidekicksForChat(user: User, options: FindSidekicksOptions = {}) {
    const { lightweight = false } = options

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

    // Fetch user chats from the database
    // const
    //  = await prisma.chat.findMany({
    //     where: {
    //         users: { some: { email: user.email } },
    //         organization: { id: user.org_id }
    //     },
    //     select: {
    //         id: true
    //     }
    // })

    const { chatflowDomain } = user
    try {
        // FIRST: Let's fetch ALL chatflows without any filters to debug
        const allChatflowsResponse = await fetch(`${chatflowDomain}/api/v1/chatflows`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        })

        let allChatflows = []
        if (allChatflowsResponse.ok) {
            allChatflows = await allChatflowsResponse.json()
            console.log('🔍 DEBUG: ALL CHATFLOWS from API:', allChatflows.length)

            // Look for the specific problematic chatflow
            const problematicId = 'dfc48a1f-62d6-480c-94da-b64f00a673f7'
            const problematicChatflow = allChatflows.find((cf) => cf.id === problematicId)

            if (problematicChatflow) {
                console.log('🎯 FOUND PROBLEMATIC CHATFLOW:', {
                    id: problematicChatflow.id,
                    name: problematicChatflow.name,
                    visibility: problematicChatflow.visibility,
                    isOwner: problematicChatflow.isOwner,
                    canEdit: problematicChatflow.canEdit,
                    type: problematicChatflow.type
                })
            } else {
                console.log('❌ PROBLEMATIC CHATFLOW NOT FOUND in all chatflows')
            }

            // Log visibility breakdown
            const visibilityBreakdown = {}
            allChatflows.forEach((cf) => {
                const vis = cf.visibility || 'undefined'
                if (!visibilityBreakdown[vis]) visibilityBreakdown[vis] = []
                visibilityBreakdown[vis].push({ id: cf.id, name: cf.name })
            })
            console.log('📊 VISIBILITY BREAKDOWN:', visibilityBreakdown)
        }

        // NOW: Fetch with the original filter
        // TEMPORARY: Let's try without any filter to see if that fixes the issue
        const DISABLE_VISIBILITY_FILTER = true // Set to false to restore original behavior

        const filterParams = DISABLE_VISIBILITY_FILTER
            ? ''
            : `?filter=${encodeURIComponent(JSON.stringify({ visibility: 'AnswerAI,Organization' }))}`

        console.log('🔧 USING FILTER:', DISABLE_VISIBILITY_FILTER ? 'NO FILTER (TEMPORARY)' : 'AnswerAI,Organization')

        const response = await fetch(`${chatflowDomain}/api/v1/chatflows${filterParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        })

        if (response.ok) {
            const result = await response.json()
            console.log('🔍 DEBUG: FILTERED CHATFLOWS (visibility: AnswerAI,Organization):', result.length)

            // Check if our problematic chatflow is in the filtered results
            const problematicId = 'dfc48a1f-62d6-480c-94da-b64f00a673f7'
            const foundInFiltered = result.find((cf) => cf.id === problematicId)
            if (foundInFiltered) {
                console.log('✅ Problematic chatflow FOUND in filtered results')
            } else {
                console.log('❌ Problematic chatflow MISSING from filtered results - this is the issue!')
            }

            // Show what chatflows got filtered out
            const filteredOutIds = allChatflows
                .filter((all) => !result.find((filtered) => filtered.id === all.id))
                .map((cf) => ({
                    id: cf.id,
                    name: cf.name,
                    visibility: cf.visibility
                }))
            console.log('🚫 CHATFLOWS FILTERED OUT:', filteredOutIds)

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

            const sidekicks: Sidekick[] = result.map((chatflow: any) => {
                // In lightweight mode, skip heavy processing
                if (lightweight) {
                    const categories = (chatflow.categories || chatflow.category ? [chatflow.category] : [])
                        .filter(Boolean)
                        .map((c) => c.trim().split(';'))
                        .flat()

                    const sidekick = {
                        id: chatflow.id || '',
                        label: chatflow.name || '',
                        visibility: chatflow.visibility || [],
                        chatflow: {
                            id: chatflow.id,
                            name: chatflow.name,
                            description: chatflow.description,
                            category: chatflow.category,
                            categories: categories,
                            isOwner: chatflow.isOwner,
                            canEdit: chatflow.canEdit
                        },
                        answersConfig: chatflow.answersConfig,
                        chatflowId: chatflow.id || '',
                        chatflowDomain: chatflowDomain,
                        category: chatflow.category,
                        categories,
                        isAvailable: chatflow.isPublic || chatflow.visibility.includes('Organization'),
                        isFavorite: false,
                        isExecutable: true, // TEMPORARY: Mark all as executable for debugging
                        // In lightweight mode, return minimal constraints
                        constraints: {
                            isSpeechToTextEnabled: false,
                            isImageUploadAllowed: false,
                            uploadSizeAndTypes: []
                        }
                    }

                    // Debug log for problematic chatflow
                    if (chatflow.id === 'dfc48a1f-62d6-480c-94da-b64f00a673f7') {
                        console.log('🎯 PROCESSING PROBLEMATIC CHATFLOW (lightweight):', {
                            id: sidekick.id,
                            name: sidekick.chatflow.name,
                            isExecutable: sidekick.isExecutable,
                            isAvailable: sidekick.isAvailable,
                            visibility: sidekick.visibility
                        })
                    }

                    return sidekick
                }

                // Full processing for non-lightweight mode
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
                    .map((c) => c.trim().split(';'))
                    .flat()

                const sidekick = {
                    id: chatflow.id || '',
                    label: chatflow.name || '',
                    visibility: chatflow.visibility || [],
                    chatflow: chatflow,
                    answersConfig: chatflow.answersConfig,
                    chatflowId: chatflow.id || '',
                    chatflowDomain: chatflowDomain,
                    chatbotConfig: parseChatbotConfig(chatflow.chatbotConfig),
                    flowData: parseFlowData(chatflow.flowData),
                    category: chatflow.category,
                    categories,
                    isAvailable: chatflow.isPublic || chatflow.visibility.includes('Organization'),
                    isFavorite: false,
                    isExecutable: true, // TEMPORARY: Mark all as executable for debugging
                    constraints: {
                        isSpeechToTextEnabled,
                        isImageUploadAllowed,
                        uploadSizeAndTypes: [
                            ...imgUploadSizeAndTypes,
                            {
                                fileTypes: [
                                    'audio/mpeg', // .mp3, .mpeg
                                    'audio/x-m4a',
                                    'audio/mp3', // .mp3 (some browsers)
                                    'audio/mp4', // .mp4, .m4a
                                    'audio/mpga', // .mpga
                                    'audio/m4a', // .m4a (some browsers)
                                    'audio/wav', // .wav
                                    'audio/webm' // .webm
                                ],
                                maxUploadSize: 10
                            }
                        ]
                    }
                }

                // Debug log for problematic chatflow
                if (chatflow.id === 'dfc48a1f-62d6-480c-94da-b64f00a673f7') {
                    console.log('🎯 PROCESSING PROBLEMATIC CHATFLOW (full):', {
                        id: sidekick.id,
                        name: sidekick.chatflow.name,
                        isExecutable: sidekick.isExecutable,
                        isAvailable: sidekick.isAvailable,
                        visibility: sidekick.visibility,
                        flowData: !!sidekick.flowData,
                        chatbotConfig: !!sidekick.chatbotConfig
                    })
                }

                return sidekick
            })

            console.log('✅ FINAL SIDEKICKS RESULT:', {
                total: sidekicks.length,
                personal: sidekicks.filter((s) => s.chatflow.isOwner).length,
                marketplace: sidekicks.filter((s) => !s.chatflow.isOwner).length,
                executable: sidekicks.filter((s) => s.isExecutable).length,
                problematicFound: sidekicks.some((s) => s.id === 'dfc48a1f-62d6-480c-94da-b64f00a673f7')
            })

            return {
                sidekicks,
                categories: getUniqueCategories(sidekicks)
            }
        } else {
            const result = await response.json()
            console.error('Chatflow error:', { result })
            if (result.statusCode == 401) throw new Error('Unauthorized')
            return { sidekicks: [], categories: { top: [], more: [] } }
        }
    } catch (err) {
        console.error('Error fetching chatflows:', err)
        throw err
    }
}

function getUniqueCategories(sidekicks: Sidekick[]) {
    const categories = [...new Set(sidekicks.map((s) => s.category))]
        .filter(Boolean)
        .map((c) => c.trim().split(';'))
        .flat()
    const topCategories = categories.slice(0, 3)
    const moreCategories = categories.slice(3)

    return {
        top: topCategories,
        more: moreCategories
    }
}
