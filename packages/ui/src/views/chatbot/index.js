import { useEffect, useState } from 'react'
import { baseURL } from 'store/constant'
import axios from 'axios'
import { FullPageChat } from 'flowise-embed-react'

// ==============================|| Chatbot ||============================== //

const fetchChatflow = async ({ chatflowId }) => {
    const username = localStorage.getItem('username')
    const password = localStorage.getItem('password')

    let chatflow = await axios
        .get(`${baseURL}/api/v1/chatflows/${chatflowId}`, { auth: username && password ? { username, password } : undefined })
        .then(async function (response) {
            return response.data
        })
        .catch(function (error) {
            console.error(error)
        })
    return chatflow
}

const ChatbotFull = () => {
    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId = URLpath[URLpath.length - 1] === 'chatbot' ? '' : URLpath[URLpath.length - 1]

    const [chatflow, setChatflow] = useState(null)
    const [chatbotTheme, setChatbotTheme] = useState({})

    useEffect(() => {
        ;(async () => {
            const fetchData = async () => {
                let response = await fetchChatflow({ chatflowId })
                setChatflow(response)
                if (response.chatbotConfig) {
                    try {
                        setChatbotTheme(JSON.parse(response.chatbotConfig))
                    } catch (e) {
                        console.error(e)
                        setChatbotTheme({})
                    }
                }
            }
            fetchData()
        })()
    }, [chatflowId])

    return (
        <>
            {!chatflow || chatflow.apikeyid ? (
                <p>Invalid Chatbot</p>
            ) : (
                <FullPageChat chatflowid={chatflow.id} apiHost={baseURL} theme={{ chatWindow: chatbotTheme }} />
            )}
        </>
    )
}

export default ChatbotFull
