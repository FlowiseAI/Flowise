import { useEffect, useState } from 'react'
import { FullPageChat } from 'flowise-embed-react'

// Project import
import NoAccessDialog from '@/ui-component/dialog/NoAccessDialog'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

//Const
import { baseURL } from '@/store/constant'

// ==============================|| Chatbot ||============================== //

const ChatbotFull = () => {
    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId = URLpath[URLpath.length - 1] === 'chatbot' ? '' : URLpath[URLpath.length - 1]

    const [chatflow, setChatflow] = useState(null)
    const [chatbotTheme, setChatbotTheme] = useState({})
    const [noAccessDialogOpen, setNoAccessDialogOpenOpen] = useState(false)
    const [isLoading, setLoading] = useState(true)
    const [chatbotOverrideConfig, setChatbotOverrideConfig] = useState({})

    const getSpecificChatflowFromPublicApi = useApi(chatflowsApi.getSpecificChatflowFromPublicEndpoint)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    useEffect(() => {
        getSpecificChatflowFromPublicApi.request(chatflowId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificChatflowFromPublicApi.error) {
            if (getSpecificChatflowFromPublicApi.error?.response?.status === 401) {
                setNoAccessDialogOpenOpen(true)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowFromPublicApi.error])

    useEffect(() => {
        if (getSpecificChatflowApi.error) {
            if (getSpecificChatflowApi.error?.response?.status === 401) {
                setNoAccessDialogOpenOpen(true)
            }
        }
    }, [getSpecificChatflowApi.error])

    useEffect(() => {
        if (getSpecificChatflowFromPublicApi.data || getSpecificChatflowApi.data) {
            const chatflowData = getSpecificChatflowFromPublicApi.data || getSpecificChatflowApi.data
            setChatflow(chatflowData)

            const chatflowType = chatflowData.type
            if (chatflowData.chatbotConfig) {
                let parsedConfig = {}
                if (chatflowType === 'MULTIAGENT') {
                    parsedConfig.showAgentMessages = true
                }

                try {
                    parsedConfig = { ...parsedConfig, ...JSON.parse(chatflowData.chatbotConfig) }
                    setChatbotTheme(parsedConfig)
                    if (parsedConfig.overrideConfig) {
                        setChatbotOverrideConfig(parsedConfig.overrideConfig)
                    }

                    if (parsedConfig.generateNewSession) {
                        localStorage.removeItem(`${chatflowData.id}_EXTERNAL`)
                    }
                } catch (e) {
                    console.error(e)
                    setChatbotTheme(parsedConfig)
                    setChatbotOverrideConfig({})
                }
            } else if (chatflowType === 'MULTIAGENT') {
                setChatbotTheme({ showAgentMessages: true })
            }
        }
    }, [getSpecificChatflowFromPublicApi.data, getSpecificChatflowApi.data])

    useEffect(() => {
        setLoading(getSpecificChatflowFromPublicApi.loading || getSpecificChatflowApi.loading)
    }, [getSpecificChatflowFromPublicApi.loading, getSpecificChatflowApi.loading])

    return (
        <>
            {!isLoading ? (
                <>
                    {!chatflow || chatflow.apikeyid ? (
                        <p>Invalid Chatbot</p>
                    ) : (
                        <FullPageChat
                            chatflowid={chatflow.id}
                            apiHost={baseURL}
                            chatflowConfig={chatbotOverrideConfig}
                            theme={{ chatWindow: chatbotTheme }}
                        />
                    )}
                    <NoAccessDialog show={noAccessDialogOpen} />
                </>
            ) : null}
        </>
    )
}

export default ChatbotFull
