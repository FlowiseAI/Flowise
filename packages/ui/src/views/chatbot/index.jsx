import { FullPageChat } from 'cmcts-c-agent-embedding-react'
import { useEffect, useState } from 'react'
import { Skeleton, ThemeProvider, createTheme } from '@mui/material'
import { styled } from '@mui/system'
import chatflowsApi from '@/api/chatflows'
import useApi from '@/hooks/useApi'
import { baseURL } from '@/store/constant'

// Custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  },
  typography: {
    fontFamily: 'Roboto, sans-serif'
  }
})

// Custom styles
const Root = styled('div')(({ theme }) => ({}))

const ErrorMessage = styled('p')(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: '1.2rem',
  fontWeight: 'bold',
  animation: 'fadeIn 0.5s ease-in-out',
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0
    },
    '100%': {
      opacity: 1
    }
  }
}))

const ChatbotFull = () => {
  const URLpath = document.location.pathname.toString().split('/')
  const chatflowId = URLpath[URLpath.length - 1] === 'chatbot' ? '' : URLpath[URLpath.length - 1]

  const [chatflow, setChatflow] = useState(null)
  const [chatbotTheme, setChatbotTheme] = useState({})
  const [chatbotOverrideConfig, setChatbotOverrideConfig] = useState({})

  const getSpecificChatflowFromPublicApi = useApi(chatflowsApi.getSpecificChatflowFromPublicEndpoint)

  const error = getSpecificChatflowFromPublicApi?.error

  useEffect(() => {
    getSpecificChatflowFromPublicApi.request(chatflowId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (getSpecificChatflowFromPublicApi?.data) {
      const chatflowData = getSpecificChatflowFromPublicApi.data
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
  }, [getSpecificChatflowFromPublicApi.data])

  return (
    <ThemeProvider theme={theme}>
      <Root>
        {getSpecificChatflowFromPublicApi.loading ? (
          <div className='w-full flex justify-center'>
            <Skeleton className='w-full flex justify-center justify-items-center' variant='rectangular' width='100%' height={400} />
          </div>
        ) : (
          <>
            {!chatflow?.id && error ? (
              <div className='flex w-full justify-center'>
                <ErrorMessage>{error.response.data.message}</ErrorMessage>
              </div>
            ) : (
              <FullPageChat
                chatflowid={chatflow?.id}
                apiHost={baseURL}
                chatflowConfig={chatbotOverrideConfig}
                theme={{ chatWindow: chatbotTheme }}
              />
            )}
          </>
        )}
      </Root>
    </ThemeProvider>
  )
}

export default ChatbotFull
