'use client'
import React, { SetStateAction, createContext, useCallback, useContext, useRef, useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { cloneDeep } from 'lodash'
import socketIOClient from 'socket.io-client'
// @ts-ignore
import { deepmerge } from '@utils/deepmerge'
import { useStreamedResponse } from './useStreamedResponse'
import { clearEmptyValues } from './clearEmptyValues'
import predictionApi from '@/api/prediction'
import chatmessagefeedbackApi from '@/api/chatmessagefeedback'

import {
    AnswersFilters,
    AppSettings,
    Chat,
    Journey,
    Message,
    Prompt,
    Sidekick,
    User,
    MessageFeedback,
    SidekickListItem,
    ChatbotConfig,
    FlowData,
    FeedbackPayload
} from 'types'
// import { useUserPlans } from './hooks/useUserPlan';

interface PredictionParams {
    question: string
    chatId?: string
    journeyId?: string
    history?: { message: string; type: string }[]
    uploads?: string[]
    audio?: File | null
    socketIOClientId?: string
}

interface AnswersContextType {
    user: User
    appSettings: AppSettings
    error?: any
    chat?: Chat | null
    setChat: (action: SetStateAction<Chat>) => void
    journey?: Journey | null
    setJourney: (action: SetStateAction<Journey>) => void
    messages?: Array<Message>
    prompts?: Array<Prompt>
    chats?: Array<Chat>
    sendMessage: (args: {
        content: string
        isNewJourney?: boolean
        sidekick?: Sidekick | SidekickListItem
        gptModel?: string
        files?: string[]
        audio?: File | null
    }) => void
    clearMessages: () => void
    regenerateAnswer: () => void
    isLoading: boolean
    filters: AnswersFilters
    setFilters: (filters: SetStateAction<AnswersFilters>) => void
    updateFilter: (newFilter: AnswersFilters) => void
    useStreaming: boolean
    setUseStreaming: (useStreaming: boolean) => void
    showFilters?: boolean
    setShowFilters: (showFilters: boolean) => void
    inputValue: string
    setInputValue: (value: string) => void
    deleteChat: (id: string) => Promise<void>
    deletePrompt: (id: string) => Promise<void>
    deleteJourney: (id: string) => Promise<void>
    updateMessage: (message: Partial<Message>) => Promise<{ data: Message }>
    updateChat: (chat: Partial<Chat>) => Promise<{ data: Chat }>
    updatePrompt: (prompt: Partial<Prompt>) => Promise<{ data: Prompt }>
    upsertJourney: (journey: Partial<Journey>) => Promise<{ data: Journey }>
    startNewChat: () => void

    messageIdx: any
    setMessages: (arg: SetStateAction<Message[]>) => void
    journeyId: any
    chatId: any
    setIsLoading: any
    setError: any
    setChatId: any
    setJourneyId: any
    setSidekick: (arg: SetStateAction<Sidekick>) => void
    sidekick?: Sidekick | SidekickListItem
    chatbotConfig?: ChatbotConfig
    flowData?: FlowData
    gptModel: string
    setGptModel: (arg: SetStateAction<string>) => void
    sendMessageFeedback: (args: FeedbackPayload) => Promise<any>
    socketIOClientId?: string
    setSocketIOClientId: (id: string) => void
    isChatFlowAvailableToStream: boolean
    handleAbort: () => Promise<void>
    feedbackId: string
    setFeedbackId: (id: string) => void
    showFeedbackContentDialog: boolean
    setShowFeedbackContentDialog: (show: boolean) => void
    submitFeedbackContent: (text: string) => Promise<void>
}
// @ts-ignore
const AnswersContext = createContext<AnswersContextType>({
    appSettings: {},
    error: null,
    messages: [],
    chats: [],
    prompts: [],
    filters: {},
    sidekick: undefined,
    updateFilter: () => {},
    sendMessage: () => {},
    regenerateAnswer: () => {},
    clearMessages: () => {},
    isLoading: false,
    inputValue: '',
    useStreaming: true,
    setUseStreaming: () => {},
    showFilters: false,
    setShowFilters: () => {},
    setInputValue: () => {},
    deleteChat: async () => {},
    deletePrompt: async () => {},
    deleteJourney: async () => {},
    startNewChat: async () => {},
    sendMessageFeedback: async () => {},
    socketIOClientId: '',
    setSocketIOClientId: () => {},
    isChatFlowAvailableToStream: false,
    handleAbort: async () => {},
    feedbackId: '',
    setFeedbackId: () => {},
    showFeedbackContentDialog: false,
    setShowFeedbackContentDialog: () => {},
    submitFeedbackContent: async () => {}
})

export function useAnswers() {
    const context = useContext(AnswersContext)

    return {
        ...context
    }
}

interface AnswersProviderProps {
    children: React.ReactNode
    user?: User
    appSettings: AppSettings
    apiUrl?: string
    useStreaming?: boolean
    chat?: Chat
    journey?: Journey
    prompts?: Prompt[]
    sidekicks?: SidekickListItem[]
    // chats?: Chat[];
}

const fetcher = (url: string) => {
    return axios
        .get(url)
        .then((res) => {
            return res.data
        })
        .catch((error) => {
            throw error
        })
}

// Add axios interceptor setup
const setupAxiosInterceptors = (apiUrl: string) => {
    // Create axios instance
    const axiosInstance = axios.create({
        baseURL: apiUrl
    })

    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config) => {
            // Get token from session storage
            const token = sessionStorage.getItem('access_token')
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }

            // Get chatflow domain from user
            const baseURL = sessionStorage.getItem('baseURL') || ''
            if (baseURL) {
                config.baseURL = `${baseURL}/api/v1`
            }

            return config
        },
        (error) => {
            return Promise.reject(error)
        }
    )

    return axiosInstance
}

export function AnswersProvider({
    chat: initialChat,
    journey: initialJourney,
    sidekicks,
    user,
    appSettings,
    children,
    prompts,
    useStreaming: initialUseStreaming = true,
    apiUrl = '/api'
}: AnswersProviderProps) {
    const router = useRouter()
    const axiosInstance = React.useMemo(() => setupAxiosInterceptors(apiUrl), [apiUrl])
    const [error, setError] = useState(null)
    const [inputValue, setInputValue] = useState('')
    // const [chat, setChat] = useState<Chat | undefined>(initialChat);
    const [journey, setJourney] = useState<Journey | undefined>(initialJourney)
    const [isLoading, setIsLoading] = useState(false)
    const [feedbackId, setFeedbackId] = useState('')
    const [showFeedbackContentDialog, setShowFeedbackContentDialog] = useState(false)

    const [showFilters, setShowFilters] = useState(false)
    const [useStreaming, setUseStreaming] = useState(initialUseStreaming)

    const [journeyId, setJourneyId] = useState<string | undefined>(journey?.id)

    const [gptModel, setGptModel] = useState('gpt-3.5-turbo')
    const messageIdx = useRef(0)
    // const { mutateActiveUserPlan } = useUserPlans();

    const { isStreaming, generateResponse } = useStreamedResponse({
        apiUrl,
        onError: (err) => {
            setIsLoading(false)
            setError(err)
        },
        // setChat,
        onChunk: (chunk: Message) => {
            // const idx = messages?.length;

            setMessages((currentMessages) => {
                const newMessages = [...currentMessages]
                newMessages[messageIdx.current] = { ...chunk, isLoading: true }

                if (chunk?.chat) {
                    if (chunk.chat?.id !== chatId) {
                        setChatId(chunk.chat.id)
                    }
                    if (chunk.chat.journeyId && chunk.chat?.journeyId !== journeyId) {
                        setJourneyId(chunk.chat.journeyId)
                    }
                }
                return newMessages
            })
        },
        onEnd: ({ chat, ...rest }) => {
            // Check if the current route is the chat
            if (chat) {
                const { id } = chat as Chat
                if (id) {
                    setMessages((currentMessages) => {
                        const newMessages = [...currentMessages]
                        newMessages[messageIdx.current] = { ...newMessages[messageIdx.current], isLoading: false }
                        return newMessages
                    })
                    setChatId(id)
                    // history.replaceState(null, '', `/chat/${id}`);
                }
                // router.refresh();
                mutate('/api/chats')
                // mutateActiveUserPlan();
            } else {
                console.log('NoChatOnEnd', { chat, ...rest })
            }
            setIsLoading(false)
        }
    })
    const [chatId, setChatId] = useState<string | undefined>(initialChat?.id)
    // false to disable for now
    const { data: chat } = useSWR<Chat>(!isStreaming && chatId && false ? `${apiUrl}/chats/${chatId}` : null, fetcher, {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        // refreshInterval: isStreaming ? 0 : 1000,
        fallbackData: initialChat,
        onSuccess(data, key, config) {
            // TODO: re enable once polling is fixed for shared chats
            // setMessages(data.messages!);
        }
    })
    const [sidekick, setSidekick] = useState<SidekickListItem | undefined>(
        sidekicks?.find((s) => s.id === chat?.messages?.[chat?.messages?.length - 1]?.chatflowid)
    )
    const chatbotConfig = React.useMemo(() => sidekick?.chatbotConfig, [sidekick])
    const flowData = React.useMemo(() => sidekick?.flowData, [sidekick])
    const [messages, setMessages] = useState<Array<Message>>(chat?.messages ?? [])
    const [filters, setFilters] = useState<AnswersFilters>(deepmerge({}, appSettings?.filters, journey?.filters, chat?.filters))

    // const setFilters = (filters: SetStateAction<AnswersFilters>) => {
    //   setFiltersState((currentFilters) => {
    //     const newFilters = typeof filters === 'function' ? filters(currentFilters) : filters;
    //     return deepmerge({}, currentFilters, newFilters);
    //   });
    // };
    const addMessage = useCallback(
        (message: Message) => {
            setMessages((currentMessages) => {
                messageIdx.current = currentMessages.length + 1
                return [...currentMessages, message]
            })
        },
        [messageIdx, setMessages]
    )

    const updateFilter = React.useCallback(
        (newFilter: AnswersFilters) => {
            const mergedSettings = clearEmptyValues(deepmerge({}, filters, newFilter))

            setFilters(mergedSettings)
        },
        [filters]
    )

    const regenerateAnswer = (retry?: boolean) => {
        const [message] = messages?.filter((m) => m.role === 'user').slice(-1) ?? []
        // setMessages(messages.slice(0, -1));
        sendMessage({ content: message.content, retry, sidekick, gptModel })
    }

    const clearMessages = () => {
        setMessages([])
        setChatId(undefined)
        setError(null)
        setIsLoading(false)
        setSidekick(undefined as SidekickListItem | undefined)
        if (chatId) {
            router.push('/journey/' + journeyId)
        }
    }

    const deleteChat = async (id: string) => axios.delete(`${apiUrl}/chats?id=${id}`).then(() => router.refresh())

    const sendMessageFeedback = async (data: FeedbackPayload) => {
        const { chatflowid } = data
        const response = await chatmessagefeedbackApi.addFeedback(chatflowid, { ...data })
        if (response.data) {
            const data = response.data
            let id = ''
            if (data && data.id) id = data.id
            // setMessages((prevMessages) => {
            //     const allMessages = [...cloneDeep(prevMessages)]
            //     return allMessages.map((message) => {
            //         if (message.id === messageId) {
            //             message.feedback = {
            //                 rating: 'THUMBS_UP'
            //             }
            //         }
            //         return message
            //     })
            // })
            setFeedbackId(id)
            setShowFeedbackContentDialog(true)
        }
    }

    const submitFeedbackContent = async (text: string) => {
        const body = {
            content: text
        }
        const result = await chatmessagefeedbackApi.updateFeedback(feedbackId, body)
        if (result.data) {
            setFeedbackId('')
            setShowFeedbackContentDialog(false)
        }
    }

    const deletePrompt = async (id: string) => axios.delete(`${apiUrl}/prompts?id=${id}`).then(() => router.refresh())
    const deleteJourney = async (id: string) => axios.delete(`${apiUrl}/journeys?id=${id}`).then(() => router.refresh())
    const updateChat = async (chat: Partial<Chat>) => axios.patch(`${apiUrl}/chats`, chat).then(() => router.refresh())
    const updatePrompt = async (prompt: Partial<Prompt>) => axios.patch(`${apiUrl}/prompts`, prompt).then(() => router.refresh())
    const upsertJourney = async (journey: Partial<Journey>) => axios.patch(`${apiUrl}/journeys`, journey)

    const updateMessage = async (message: Partial<Message>) => axios.patch(`${apiUrl}/messages`, message).then(() => router.refresh())

    const startNewChat = () => {
        if (journey) {
            router.push(`/journey/${journey.id}`)
            setJourneyId(journey.id)
        } else {
            router.push('/chat')
            setJourneyId(undefined)
        }
        setChatId(undefined)
        setMessages([])
        setFilters({})
    }
    const [socketIOClientId, setSocketIOClientId] = useState('')
    const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = useState(false)
    const [isMessageStopping, setIsMessageStopping] = useState(false)

    const updateLastMessage = (text: string) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].content += text
            return allMessages
        })
    }

    const updateLastMessageSourceDocuments = (sourceDocuments: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].sourceDocuments = sourceDocuments
            return allMessages
        })
    }

    const updateLastMessageUsedTools = (usedTools: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].usedTools = usedTools
            return allMessages
        })
    }

    const updateLastMessageFileAnnotations = (fileAnnotations: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].fileAnnotations = fileAnnotations
            return allMessages
        })
    }

    const updateLastMessageAgentReasoning = (agentReasoning: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].agentReasoning = agentReasoning
            return allMessages
        })
    }

    const updateLastMessageAction = (action: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            allMessages[allMessages.length - 1].action = action
            return allMessages
        })
    }

    const updateLastMessageNextAgent = (nextAgent: any) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning
            if (lastAgentReasoning && lastAgentReasoning.length > 0) {
                lastAgentReasoning.push({ nextAgent })
            }
            allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning
            return allMessages
        })
    }

    const abortMessage = () => {
        setIsMessageStopping(false)
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].role === 'user') return allMessages
            const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning
            if (lastAgentReasoning && lastAgentReasoning.length > 0) {
                allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning.filter(
                    (reasoning: { nextAgent?: any }) => !reasoning.nextAgent
                )
            }
            return allMessages
        })
    }

    const handleAbort = async () => {
        setIsMessageStopping(true)
        try {
            if (sidekick?.id && chatId) {
                await predictionApi.abortMessage(sidekick.id, chatId)
            }
        } catch (error: any) {
            setIsMessageStopping(false)
            setError(error.response?.data?.message || 'Error aborting message')
        }
    }

    const sendMessage = useCallback(
        async ({
            content,
            sidekick,
            gptModel,
            retry,
            files,
            audio
        }: {
            content: string
            sidekick?: SidekickListItem
            gptModel?: string
            retry?: boolean
            files?: string[]
            audio?: File | null
        }) => {
            if (!retry) {
                const fileUploads = files
                addMessage({ role: 'user', content, fileUploads } as Message)
            }
            setError(null)
            setIsLoading(true)

            try {
                const params = {
                    question: content,
                    chatId,
                    journeyId,
                    history: messages?.map(({ content, role }) => ({
                        message: content,
                        type: role === 'assistant' ? 'apiMessage' : 'userMessage'
                    })),
                    uploads: files,
                    audio,
                    socketIOClientId: isChatFlowAvailableToStream ? socketIOClientId : undefined
                }

                const response = await predictionApi.sendMessageAndGetPrediction(sidekick?.id!, params)
                const data = response.data
                setMessages((prevMessages) => {
                    let allMessages = [...cloneDeep(prevMessages)]
                    if (allMessages[allMessages.length - 1].type === 'apiMessage') {
                        allMessages[allMessages.length - 1].id = data?.chatMessageId
                    }
                    return allMessages
                })
                setChatId(data.chatId)

                if (content === '' && data.question) {
                    // the response contains the question even if it was in an audio format
                    // so if input is empty but the response contains the question, update the user message to show the question
                    setMessages((prevMessages) => {
                        let allMessages = [...cloneDeep(prevMessages)]
                        if (allMessages[allMessages.length - 2].type === 'apiMessage') return allMessages
                        allMessages[allMessages.length - 2].content = data.question
                        return allMessages
                    })
                }
                if (!isChatFlowAvailableToStream) {
                    let text = ''
                    if (data.text) text = data.text
                    else if (data.json) text = '```json\n' + JSON.stringify(data.json, null, 2)
                    else text = JSON.stringify(data, null, 2)

                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            role: 'assistant',
                            content: text,
                            id: data?.chatMessageId,
                            sourceDocuments: data?.sourceDocuments,
                            usedTools: data?.usedTools,
                            fileAnnotations: data?.fileAnnotations,
                            agentReasoning: data?.agentReasoning,
                            action: data?.action,
                            type: 'apiMessage',
                            feedback: null,
                            isLoading: false,
                            chat: data.chat
                        }
                    ])
                }
                // if (!isChatFlowAvailableToStream || !socketIOClientId) {

                //     if (data?.chatId) {
                //         setChatId(data.chatId)
                //     }

                //     setMessages((prevMessages) => [
                //         ...prevMessages,
                //         {
                //             role: 'assistant',
                //             content: data.text || JSON.stringify(data.json || data, null, 2),
                //             id: data?.chatMessageId,
                //             sourceDocuments: data?.sourceDocuments,
                //             usedTools: data?.usedTools,
                //             fileAnnotations: data?.fileAnnotations,
                //             agentReasoning: data?.agentReasoning,
                //             action: data?.action,
                //             isLoading: false,
                //             chat: data.chat
                //         } as Message
                //     ])

                mutate('/api/chats')
                setIsLoading(false)
                // } else {
                //     // For streaming, the socket connection will handle message updates
                //     setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: '', isLoading: true } as Message])
                // }

                setInputValue('')
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || 'Error sending message'
                setError(errorMessage)
                setIsLoading(false)
                setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: errorMessage } as Message])
            }
        },
        [
            addMessage,
            chatId,
            journeyId,
            messages,
            socketIOClientId,
            isChatFlowAvailableToStream,
            setInputValue,
            setMessages,
            setChatId,
            setJourneyId,
            mutate
        ]
    )

    useEffect(() => {
        let socket: any
        if (sidekick?.id) {
            const baseURL = sessionStorage.getItem('baseURL') || ''
            socket = socketIOClient(baseURL, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            })

            socket.on('connect', () => {
                setSocketIOClientId(socket.id)
                setIsChatFlowAvailableToStream(true)
            })

            socket.on('start', () => {
                setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: '', isLoading: true } as Message])
            })

            socket.on('token', updateLastMessage)
            socket.on('sourceDocuments', updateLastMessageSourceDocuments)
            socket.on('usedTools', updateLastMessageUsedTools)
            socket.on('fileAnnotations', updateLastMessageFileAnnotations)
            socket.on('agentReasoning', updateLastMessageAgentReasoning)
            socket.on('action', updateLastMessageAction)
            socket.on('nextAgent', updateLastMessageNextAgent)
            socket.on('abort', abortMessage)

            socket.on('end', () => {
                setMessages((prevMessages) => {
                    const allMessages = [...cloneDeep(prevMessages)]
                    const lastMessage = allMessages[allMessages.length - 1]
                    if (lastMessage?.role === 'user') return allMessages
                    lastMessage.isLoading = false
                    return allMessages
                })
                setIsLoading(false)
            })

            socket.on('disconnect', () => {
                setIsChatFlowAvailableToStream(false)
                setSocketIOClientId('')
            })

            socket.on('error', (error: any) => {
                setError(error?.message || 'Error during streaming')
                setIsLoading(false)
            })

            return () => {
                if (socket) {
                    socket.disconnect()
                    setSocketIOClientId('')
                    setIsChatFlowAvailableToStream(false)
                }
            }
        }
    }, [sidekick?.id])

    React.useEffect(() => {
        setJourney(initialJourney)
        setFilters(deepmerge({}, initialJourney?.filters, initialChat?.filters))
    }, [initialChat, initialJourney, appSettings])

    const [previews, setPreviews] = useState<any[]>([])
    const [isDragActive, setIsDragActive] = useState(false)
    const fileUploadRef = useRef<HTMLInputElement>(null)

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragActive(false)
        let files = []
        if (e.dataTransfer.files.length > 0) {
            for (const file of Array.from(e.dataTransfer.files)) {
                const reader = new FileReader()
                const { name } = file
                files.push(
                    new Promise((resolve) => {
                        reader.onload = (evt) => {
                            if (!evt?.target?.result) {
                                return
                            }
                            const { result } = evt.target
                            let previewUrl
                            if (file.type.startsWith('audio/')) {
                                previewUrl = '/audio-upload.svg' // You'll need to add this asset
                            } else if (file.type.startsWith('image/')) {
                                previewUrl = URL.createObjectURL(file)
                            }
                            resolve({
                                data: result,
                                preview: previewUrl,
                                type: 'file',
                                name: name,
                                mime: file.type
                            })
                        }
                        reader.readAsDataURL(file)
                    })
                )
            }

            const newFiles = await Promise.all(files)
            setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true)
        } else if (e.type === 'dragleave') {
            setIsDragActive(false)
        }
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileObj = event.target.files && event.target.files[0]
        if (!fileObj) {
            return
        }
        let files = []
        if (event.target.files) {
            for (const file of Array.from(event.target.files)) {
                const reader = new FileReader()
                const { name } = file
                files.push(
                    new Promise((resolve) => {
                        reader.onload = (evt) => {
                            if (!evt?.target?.result) {
                                return
                            }
                            const { result } = evt.target
                            resolve({
                                data: result,
                                preview: URL.createObjectURL(file),
                                type: 'file',
                                name: name,
                                mime: file.type
                            })
                        }
                        reader.readAsDataURL(file)
                    })
                )
            }
        }

        const newFiles = await Promise.all(files)
        setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
        // Reset file input
        event.target.value = ''
    }

    const handleUploadClick = () => {
        fileUploadRef.current?.click()
    }

    const clearPreviews = () => {
        previews.forEach((file) => URL.revokeObjectURL(file.preview))
        setPreviews([])
    }

    const handleDeletePreview = (itemToDelete: any) => {
        if (itemToDelete.type === 'file') {
            URL.revokeObjectURL(itemToDelete.preview)
        }
        setPreviews(previews.filter((item) => item !== itemToDelete))
    }

    const contextValue = {
        user,
        appSettings,
        chat,
        journey,
        messages,
        setJourney,
        setMessages,
        prompts,
        filters,
        setFilters,
        isLoading,
        setIsLoading,
        useStreaming,
        setUseStreaming,
        error,
        setError,
        showFilters,
        setShowFilters,
        inputValue,
        setInputValue,
        chatId,
        setChatId,
        journeyId,
        setJourneyId,
        messageIdx,
        sidekick,
        setSidekick,
        chatbotConfig,
        flowData,
        gptModel,
        setGptModel,
        sendMessage,
        clearMessages,
        regenerateAnswer,
        updateFilter,
        addMessage,
        deleteChat,
        deletePrompt,
        deleteJourney,
        updateChat,
        updatePrompt,
        upsertJourney,
        updateMessage,
        startNewChat,
        sendMessageFeedback,
        socketIOClientId,
        setSocketIOClientId,
        isChatFlowAvailableToStream,
        handleAbort,
        feedbackId,
        setFeedbackId,
        showFeedbackContentDialog,
        setShowFeedbackContentDialog,
        submitFeedbackContent
    }
    // @ts-ignore
    return <AnswersContext.Provider value={contextValue}>{children}</AnswersContext.Provider>
}
