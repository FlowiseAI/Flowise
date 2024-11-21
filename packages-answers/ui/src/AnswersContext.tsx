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
    FlowData
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
    sendMessage: (args: { content: string; isNewJourney?: boolean; sidekick?: Sidekick; gptModel?: string }) => void
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
    sendMessageFeedback: (args: Partial<MessageFeedback>) => void
    socketIOClientId?: string
    setSocketIOClientId: (id: string) => void
    isChatFlowAvailableToStream: boolean
    handleAbort: () => Promise<void>
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
    handleAbort: async () => {}
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

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

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
    user,
    appSettings,
    children,
    prompts,
    sidekicks,
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

    const [showFilters, setShowFilters] = useState(false)
    const [useStreaming, setUseStreaming] = useState(initialUseStreaming)

    const [journeyId, setJourneyId] = useState<string | undefined>(journey?.id)
    const [sidekick, setSidekick] = useState<SidekickListItem>()

    const [gptModel, setGptModel] = useState('gpt-3.5-turbo')
    const messageIdx = useRef(0)
    // const { mutateActiveUserPlan } = useUserPlans();
    const chatbotConfig = React.useMemo(() => sidekick?.chatbotConfig, [sidekick])
    const flowData = React.useMemo(() => sidekick?.flowData, [sidekick])
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
        setSidekick(undefined)
        if (chatId) {
            router.push('/journey/' + journeyId)
        }
    }

    const deleteChat = async (id: string) => axios.delete(`${apiUrl}/chats?id=${id}`).then(() => router.refresh())

    const sendMessageFeedback = async (data: Partial<MessageFeedback>) =>
        axios.post(`${apiUrl}/chats/message_feedback`, data).then(() => router.refresh())

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
            await abortMessage(sidekick?.id!, chatId!)
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
                const fileUploads = files?.map((file) => ({
                    data: file,
                    type: 'file'
                }))
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

                if (isChatFlowAvailableToStream && socketIOClientId) {
                    await predictionApi.sendMessageAndGetPrediction(sidekick?.id!, params)
                } else {
                    const { data } = await predictionApi.sendMessageAndGetPrediction(sidekick?.id!, params)

                    if (data?.chat?.id && data.chat.id !== chatId) {
                        setChatId(data.chat.id)
                        if (data.chat.journeyId) {
                            setJourneyId(data.chat.journeyId)
                        }
                    }

                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            role: 'assistant',
                            content: data.text || JSON.stringify(data.json || data, null, 2),
                            id: data?.chatMessageId,
                            sourceDocuments: data?.sourceDocuments,
                            usedTools: data?.usedTools,
                            fileAnnotations: data?.fileAnnotations,
                            agentReasoning: data?.agentReasoning,
                            action: data?.action,
                            isLoading: false,
                            chat: data.chat
                        } as Message
                    ])

                    mutate('/api/chats')
                    setIsLoading(false)
                }

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
        handleAbort
    }
    // @ts-ignore
    return <AnswersContext.Provider value={contextValue}>{children}</AnswersContext.Provider>
}
