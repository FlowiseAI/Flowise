'use client'
import React, { useEffect, useState } from 'react'
import { FullPageChat } from 'aai-embed-react'
import { useNavigate, usePathname } from '@/utils/navigation'
import PropTypes from 'prop-types'
// Project import

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

//Const
import { baseURL, setBaseURL } from '@/store/constant'
import { Box } from '@mui/material'

// ==============================|| Chatbot ||============================== //

const ChatbotFull = ({ apiHost, chatflowId: defaultChatflowId }) => {
    React.useEffect(() => {
        setBaseURL(apiHost)
    }, [apiHost])
    const pathname = usePathname()
    const URLpath = pathname.split('/')
    const chatflowId = defaultChatflowId
    const navigate = useNavigate()

    const [chatflow, setChatflow] = useState(null)
    const [chatbotTheme, setChatbotTheme] = useState({})
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})
    const [isLoading, setLoading] = useState(true)
    const [chatbotOverrideConfig, setChatbotOverrideConfig] = useState({})

    const getSpecificChatflowFromPublicApi = useApi(chatflowsApi.getSpecificChatflowFromPublicEndpoint)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    const onLoginClick = (username, password) => {
        localStorage.setItem('username', username)
        localStorage.setItem('password', password)
        navigate(0)
    }

    useEffect(() => {
        getSpecificChatflowFromPublicApi.request(chatflowId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificChatflowFromPublicApi.error) {
            if (getSpecificChatflowFromPublicApi.error?.response?.status === 401) {
                if (localStorage.getItem('username') && localStorage.getItem('password')) {
                    getSpecificChatflowApi.request(chatflowId)
                } else {
                    setLoginDialogProps({
                        title: 'Login',
                        confirmButtonName: 'Login'
                    })
                    setLoginDialogOpen(true)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowFromPublicApi.error])

    useEffect(() => {
        if (getSpecificChatflowApi.error) {
            if (getSpecificChatflowApi.error?.response?.status === 401) {
                setLoginDialogProps({
                    title: 'Login',
                    confirmButtonName: 'Login'
                })
                setLoginDialogOpen(true)
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
                        // Generate new sessionId
                        if (parsedConfig.overrideConfig.generateNewSession) {
                            parsedConfig.overrideConfig.sessionId = Date.now().toString()
                        }
                        setChatbotOverrideConfig(parsedConfig.overrideConfig)
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
                        <Box sx={{ width: '100%', '>*': { width: '100%' } }}>
                            <FullPageChat
                                chatflowid={chatflow.id}
                                apiHost={apiHost ?? baseURL}
                                chatflowConfig={chatbotOverrideConfig}
                                theme={{ chatWindow: chatbotTheme }}
                            />
                        </Box>
                    )}
                    {/* <LoginDialog show={loginDialogOpen} dialogProps={loginDialogProps} onConfirm={onLoginClick} /> */}
                </>
            ) : null}
        </>
    )
}
ChatbotFull.propTypes = {
    apiHost: PropTypes.string,
    chatflowId: PropTypes.string
}
export default ChatbotFull
