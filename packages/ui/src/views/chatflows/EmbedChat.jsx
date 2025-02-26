import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

import { baseURL } from '@/store/constant'
import { Box, Tab, Tabs } from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'
// Project import

// Const
function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

const EmbedChat = ({ chatflowid }) => {
    const codes = ['Popup Html']
    const [value, setValue] = useState(0)

    const [content, setContent] = useState('')

    useEffect(() => {
        const isInIframe = window.self !== window.top

        if (isInIframe) {
            console.log('hi')
            // Inside an iframe: request uitype from parent
            window.parent.postMessage({ type: 'REQUEST_UITYPE' }, '*')

            const messageHandler = (event) => {
                if (event.data.type === 'RESPONSE_UITYPE') {
                    const { uitype, hostAppURL } = event.data

                    if (uitype === 'gait') {
                        // uitype is "gait", return iframe HTML
                        const iframeURL = `${hostAppURL}/app-frame/${chatflowid}`
                        const htmlContent = `<div style="height: 100%; width: 100%; position: fixed; z-index: 9999">
                <iframe 
                  style="width: 100%; height: 100%" 
                  src="${iframeURL}" 
                  frameborder="0">
                </iframe>
              </div>
            `
                        setContent(htmlContent)
                    } else {
                        // uitype is not "gait", return script tag
                        const htmlContent = `<script type="module">
                            import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js";
                            Chatbot.init({
                                chatflowid: "${chatflowid}",
                                apiHost: "${baseURL}",
                            });
                        </script>
            `
                        setContent(htmlContent)
                    }

                    window.removeEventListener('message', messageHandler)
                }
            }

            window.addEventListener('message', messageHandler)
        } else {
            // Not inside an iframe, return script tag
            const htmlContent = `
        <script type="module">
          import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js";
          Chatbot.init({
            chatflowid: "${chatflowid}",
            apiHost: "${baseURL}",
          });
        </script>
      `
            setContent(htmlContent)
        }
    }, [chatflowid])

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div style={{ flex: 80 }}>
                    <Tabs value={value} onChange={handleChange} aria-label='tabs'>
                        {codes.map((codeLang, index) => (
                            <Tab key={index} label={codeLang} {...a11yProps(index)}></Tab>
                        ))}
                    </Tabs>
                </div>
            </div>
            <div style={{ marginTop: 10 }}></div>
            {codes.map((codeLang, index) => (
                <TabPanel key={index} value={value} index={index}>
                    {(value === 0 || value === 1) && (
                        <>
                            <span>
                                Paste this anywhere in the <code>{`<body>`}</code> tag of your html file.
                            </span>
                            <div style={{ height: 10 }}></div>
                        </>
                    )}
                    <CopyBlock theme={atomOneDark} text={content} language='javascript' showLineNumbers={false} wrapLines />
                </TabPanel>
            ))}
        </>
    )
}

EmbedChat.propTypes = {
    chatflowid: PropTypes.string
}

export default EmbedChat
