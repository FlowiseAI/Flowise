import { useState } from 'react'
import PropTypes from 'prop-types'

import { Tabs, Tab, Box } from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'

// Project import
import { CheckboxInput } from '@/ui-component/checkbox/Checkbox'

// Const
import { baseURL } from '@/store/constant'

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

const embedPopupHtmlCode = (chatflowid) => {
    return `<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.init({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
    })
</script>`
}

const embedPopupReactCode = (chatflowid) => {
    return `import { BubbleChat } from 'flowise-embed-react'

const App = () => {
    return (
        <BubbleChat chatflowid="${chatflowid}" apiHost="${baseURL}" />
    );
};`
}

const embedFullpageHtmlCode = (chatflowid) => {
    return `<flowise-fullchatbot></flowise-fullchatbot>
<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.initFull({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
    })
</script>`
}

const embedFullpageReactCode = (chatflowid) => {
    return `import { FullPageChat } from "flowise-embed-react"

const App = () => {
    return (
        <FullPageChat
            chatflowid="${chatflowid}"
            apiHost="${baseURL}"
        />
    );
};`
}

const buttonConfig = (isReact = false) => {
    return isReact
        ? `button: {
                    backgroundColor: "#3B81F6",
                    right: 20,
                    bottom: 20,
                    size: 48, // small | medium | large | number
                    dragAndDrop: true,
                    iconColor: "white",
                    customIconSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg",
                    autoWindowOpen: {
                        autoOpen: true, //parameter to control automatic window opening
                        openDelay: 2, // Optional parameter for delay time in seconds
                        autoOpenOnMobile: false, //parameter to control automatic window opening in mobile
                        },
                }`
        : `button: {
                backgroundColor: "#3B81F6",
                right: 20,
                bottom: 20,
                size: 48, // small | medium | large | number
                dragAndDrop: true,
                iconColor: "white",
                customIconSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg",
                autoWindowOpen: {
                    autoOpen: true, //parameter to control automatic window opening
                    openDelay: 2, // Optional parameter for delay time in seconds
                    autoOpenOnMobile: false, //parameter to control automatic window opening in mobile
                    },
            }`
}

const tooltipConfig = (isReact = false) => {
    return isReact
        ? `tooltip: {
                    showTooltip: true,
                    tooltipMessage: 'Hi There 👋!',
                    tooltipBackgroundColor: 'black',
                    tooltipTextColor: 'white',
                    tooltipFontSize: 16,
                }`
        : `tooltip: {
                showTooltip: true,
                tooltipMessage: 'Hi There 👋!',
                tooltipBackgroundColor: 'black',
                tooltipTextColor: 'white',
                tooltipFontSize: 16,
            }`
}

const chatwindowConfig = (isReact = false) => {
    return isReact
        ? `chatWindow: {
                    showTitle: true,
                    title: 'Flowise Bot',
                    titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                    showAgentMessages: true,
                    welcomeMessage: 'Hello! This is custom welcome message',
                    errorMessage: 'This is a custom error message',
                    backgroundColor: "#ffffff",
                    backgroundImage: 'enter image path or link', // If set, this will overlap the background color of the chat window.
                    height: 700,
                    width: 400,
                    fontSize: 16,
                    //starterPrompts: ['What is a bot?', 'Who are you?'], // It overrides the starter prompts set by the chat flow passed
                    starterPromptFontSize: 15,
                    clearChatOnReload: false, // If set to true, the chat will be cleared when the page reloads.
                    botMessage: {
                        backgroundColor: "#f7f8ff",
                        textColor: "#303235",
                        showAvatar: true,
                        avatarSrc: "https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png",
                    },
                    userMessage: {
                        backgroundColor: "#3B81F6",
                        textColor: "#ffffff",
                        showAvatar: true,
                        avatarSrc: "https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png",
                    },
                    textInput: {
                        placeholder: 'Type your question',
                        backgroundColor: '#ffffff',
                        textColor: '#303235',
                        sendButtonColor: '#3B81F6',
                        maxChars: 50,
                        maxCharsWarningMessage: 'You exceeded the characters limit. Please input less than 50 characters.',
                        autoFocus: true, // If not used, autofocus is disabled on mobile and enabled on desktop. true enables it on both, false disables it on both.
                        sendMessageSound: true,
                        // sendSoundLocation: "send_message.mp3", // If this is not used, the default sound effect will be played if sendSoundMessage is true.
                        receiveMessageSound: true,
                        // receiveSoundLocation: "receive_message.mp3", // If this is not used, the default sound effect will be played if receiveSoundMessage is true.
                    },
                    feedback: {
                        color: '#303235',
                    },
                    footer: {
                        textColor: '#303235',
                        text: 'Powered by',
                        company: 'Flowise',
                        companyLink: 'https://flowiseai.com',
                    }
                }`
        : `chatWindow: {
                showTitle: true,
                title: 'Flowise Bot',
                titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                showAgentMessages: true,
                welcomeMessage: 'Hello! This is custom welcome message',
                errorMessage: 'This is a custom error message',
                backgroundColor: "#ffffff",
                backgroundImage: 'enter image path or link', // If set, this will overlap the background color of the chat window.
                height: 700,
                width: 400,
                fontSize: 16,
                //starterPrompts: ['What is a bot?', 'Who are you?'], // It overrides the starter prompts set by the chat flow passed
                starterPromptFontSize: 15,
                clearChatOnReload: false, // If set to true, the chat will be cleared when the page reloads.
                botMessage: {
                    backgroundColor: "#f7f8ff",
                    textColor: "#303235",
                    showAvatar: true,
                    avatarSrc: "https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png",
                },
                userMessage: {
                    backgroundColor: "#3B81F6",
                    textColor: "#ffffff",
                    showAvatar: true,
                    avatarSrc: "https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png",
                },
                textInput: {
                    placeholder: 'Type your question',
                    backgroundColor: '#ffffff',
                    textColor: '#303235',
                    sendButtonColor: '#3B81F6',
                    maxChars: 50,
                    maxCharsWarningMessage: 'You exceeded the characters limit. Please input less than 50 characters.',
                    autoFocus: true, // If not used, autofocus is disabled on mobile and enabled on desktop. true enables it on both, false disables it on both.
                    sendMessageSound: true,
                    // sendSoundLocation: "send_message.mp3", // If this is not used, the default sound effect will be played if sendSoundMessage is true.
                    receiveMessageSound: true,
                    // receiveSoundLocation: "receive_message.mp3", // If this is not used, the default sound effect will be played if receiveSoundMessage is true. 
                },
                feedback: {
                    color: '#303235',
                },
                footer: {
                    textColor: '#303235',
                    text: 'Powered by',
                    company: 'Flowise',
                    companyLink: 'https://flowiseai.com',
                }
            }`
}

const embedPopupHtmlCodeCustomization = (chatflowid) => {
    return `<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.init({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
        chatflowConfig: {
            // topK: 2
        },
        theme: {
            ${buttonConfig()},
            ${tooltipConfig()},
            ${chatwindowConfig()}
        }
    })
</script>`
}

const embedPopupReactCodeCustomization = (chatflowid) => {
    return `import { BubbleChat } from 'flowise-embed-react'

const App = () => {
    return (
        <BubbleChat
            chatflowid="${chatflowid}"
            apiHost="${baseURL}"
            theme={{
                ${buttonConfig(true)},
                ${tooltipConfig(true)},
                ${chatwindowConfig(true)}
            }}
        />
    );
};`
}

const embedFullpageHtmlCodeCustomization = (chatflowid) => {
    return `<flowise-fullchatbot></flowise-fullchatbot>
<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.initFull({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
        theme: {
            ${chatwindowConfig()}
        }
    })
</script>`
}

const embedFullpageReactCodeCustomization = (chatflowid) => {
    return `import { FullPageChat } from "flowise-embed-react"

const App = () => {
    return (
        <FullPageChat
            chatflowid="${chatflowid}"
            apiHost="${baseURL}"
            theme={{
                ${chatwindowConfig(true)}
            }}
        />
    );
};`
}

const EmbedChat = ({ chatflowid }) => {
    const codes = ['Popup Html', 'Fullpage Html', 'Popup React', 'Fullpage React']
    const [value, setValue] = useState(0)
    const [embedChatCheckboxVal, setEmbedChatCheckbox] = useState(false)

    const onCheckBoxEmbedChatChanged = (newVal) => {
        setEmbedChatCheckbox(newVal)
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const getCode = (codeLang) => {
        switch (codeLang) {
            case 'Popup Html':
                return embedPopupHtmlCode(chatflowid)
            case 'Fullpage Html':
                return embedFullpageHtmlCode(chatflowid)
            case 'Popup React':
                return embedPopupReactCode(chatflowid)
            case 'Fullpage React':
                return embedFullpageReactCode(chatflowid)
            default:
                return ''
        }
    }

    const getCodeCustomization = (codeLang) => {
        switch (codeLang) {
            case 'Popup Html':
                return embedPopupHtmlCodeCustomization(chatflowid)
            case 'Fullpage Html':
                return embedFullpageHtmlCodeCustomization(chatflowid)
            case 'Popup React':
                return embedPopupReactCodeCustomization(chatflowid)
            case 'Fullpage React':
                return embedFullpageReactCodeCustomization(chatflowid)
            default:
                return ''
        }
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
                                <p>
                                    You can also specify a&nbsp;
                                    <a
                                        rel='noreferrer'
                                        target='_blank'
                                        href='https://www.npmjs.com/package/flowise-embed?activeTab=versions'
                                    >
                                        version
                                    </a>
                                    :&nbsp;<code>{`https://cdn.jsdelivr.net/npm/flowise-embed@<version>/dist/web.js`}</code>
                                </p>
                            </span>
                            <div style={{ height: 10 }}></div>
                        </>
                    )}
                    <CopyBlock theme={atomOneDark} text={getCode(codeLang)} language='javascript' showLineNumbers={false} wrapLines />

                    <CheckboxInput label='Show Embed Chat Config' value={embedChatCheckboxVal} onChange={onCheckBoxEmbedChatChanged} />

                    {embedChatCheckboxVal && (
                        <CopyBlock
                            theme={atomOneDark}
                            text={getCodeCustomization(codeLang)}
                            language='javascript'
                            showLineNumbers={false}
                            wrapLines
                        />
                    )}
                </TabPanel>
            ))}
        </>
    )
}

EmbedChat.propTypes = {
    chatflowid: PropTypes.string
}

export default EmbedChat
