import { useState } from 'react'
import PropTypes from 'prop-types'

import { Tabs, Tab, Box } from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'

// Project import
import { CheckboxInput } from '@/ui-component/checkbox/Checkbox'

// Const
import { baseURL } from '@/store/constant'

// i18n
import { useTranslation, Trans } from 'react-i18next'
import i18next from 'i18next'

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
        <BubbleChat
            chatflowid="${chatflowid}"
            apiHost="${baseURL}"
        />
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

export const defaultThemeConfig = (t) => {
    return {
        button: {
            backgroundColor: '#3B81F6',
            right: 20,
            bottom: 20,
            size: 48,
            dragAndDrop: true,
            iconColor: 'white',
            customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
            autoWindowOpen: {
                autoOpen: true,
                openDelay: 2,
                autoOpenOnMobile: false
            }
        },
        tooltip: {
            showTooltip: true,
            tooltipMessage: i18next.t('chatflows.chat.tooltipMessage'),
            tooltipBackgroundColor: 'black',
            tooltipTextColor: 'white',
            tooltipFontSize: 16
        },
        disclaimer: {
            title: i18next.t('chatflows.chat.disclaimer.title'),
            message: i18next.t('chatflows.chat.disclaimer.message'),
            textColor: 'black',
            buttonColor: '#3b82f6',
            buttonText: i18next.t('chatflows.chat.disclaimer.buttonText'),
            buttonTextColor: 'white',
            blurredBackgroundColor: 'rgba(0, 0, 0, 0.4)',
            backgroundColor: 'white'
        },
        customCSS: ``,
        chatWindow: {
            showTitle: true,
            showAgentMessages: true,
            title: i18next.t('chatflows.chat.chatWindow.title'),
            titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
            welcomeMessage: i18next.t('chatflows.chat.chatWindow.welcomeMessage'),
            errorMessage: i18next.t('chatflows.chat.chatWindow.errorMessage'),
            backgroundColor: '#ffffff',
            backgroundImage: i18next.t('chatflows.chat.chatWindow.backgroundImage'),
            height: 700,
            width: 400,
            fontSize: 16,
            starterPrompts: ['What is a bot?', 'Who are you?'],
            starterPromptFontSize: 15,
            clearChatOnReload: false,
            sourceDocsTitle: i18next.t('chatflows.chat.chatWindow.sourceDocsTitle'),
            renderHTML: true,
            botMessage: {
                backgroundColor: '#f7f8ff',
                textColor: '#303235',
                showAvatar: true,
                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
            },
            userMessage: {
                backgroundColor: '#3B81F6',
                textColor: '#ffffff',
                showAvatar: true,
                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
            },
            textInput: {
                placeholder: i18next.t('chatflows.chat.textInput.placeholder'),
                backgroundColor: '#ffffff',
                textColor: '#303235',
                sendButtonColor: '#3B81F6',
                maxChars: 50,
                maxCharsWarningMessage: t('chatflows.chat.textInput.maxCharsWarningMessage'),
                autoFocus: true,
                sendMessageSound: true,
                sendSoundLocation: 'send_message.mp3',
                receiveMessageSound: true,
                receiveSoundLocation: 'receive_message.mp3'
            },
            feedback: {
                color: '#303235'
            },
            dateTimeToggle: {
                date: true,
                time: true
            },
            footer: {
                textColor: '#303235',
                text: i18next.t('chatflows.chat.footer.text'),
                company: i18next.t('chatflows.chat.footer.company'),
                companyLink: 'https://flowiseai.com'
            }
        }
    }
}

const customStringify = (obj) => {
    let stringified = JSON.stringify(obj, null, 4)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/: "([^"]+)"/g, (match, value) => (value.includes('<') ? `: "${value}"` : `: '${value}'`))
        .replace(/: "(true|false|\d+)"/g, ': $1')
        .replace(/customCSS: ""/g, 'customCSS: ``')
    return stringified
        .split('\n')
        .map((line, index) => {
            if (index === 0) return line
            return ' '.repeat(8) + line
        })
        .join('\n')
}

const embedPopupHtmlCodeCustomization = (chatflowid) => {
    return `<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.init({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
        chatflowConfig: {
            /* Chatflow Config */
        },
        observersConfig: {
            /* Observers Config */
        },
        theme: ${customStringify(defaultThemeConfig)}
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
            chatflowConfig={{
                /* Chatflow Config */
            }}
            observersConfig={{
                /* Observers Config */
            }}
            theme={{${customStringify(defaultThemeConfig)
                .substring(1)
                .split('\n')
                .map((line) => ' '.repeat(4) + line)
                .join('\n')}
        />
    )
}`
}

const getFullPageThemeConfig = () => {
    return {
        ...defaultThemeConfig,
        chatWindow: {
            ...defaultThemeConfig.chatWindow,
            height: '100%',
            width: '100%'
        }
    }
}

const embedFullpageHtmlCodeCustomization = (chatflowid) => {
    return `<flowise-fullchatbot></flowise-fullchatbot>
<script type="module">
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
    Chatbot.initFull({
        chatflowid: "${chatflowid}",
        apiHost: "${baseURL}",
        chatflowConfig: {
            /* Chatflow Config */
        },
        observersConfig: {
            /* Observers Config */
        },
        theme: ${customStringify(getFullPageThemeConfig())}
    })
</script>`
}

const embedFullpageReactCodeCustomization = (chatflowid) => {
    return `import { FullPageChat } from 'flowise-embed-react'

const App = () => {
    return (
        <FullPageChat
            chatflowid="${chatflowid}"
            apiHost="${baseURL}"
            chatflowConfig={{
                /* Chatflow Config */
            }}
            observersConfig={{
                /* Observers Config */
            }}
            theme={{${customStringify(getFullPageThemeConfig())
                .substring(1)
                .split('\n')
                .map((line) => ' '.repeat(4) + line)
                .join('\n')}
        />
    )
}`
}

const EmbedChat = ({ chatflowid }) => {
    const { t } = useTranslation()
    const codes = [
        { id: 'Popup Html', label: 'chatflows.codes.popupHtml' },
        { id: 'Fullpage Html', label: 'chatflows.codes.fullpageHtml' },
        { id: 'Popup React', label: 'chatflows.codes.popupReact' },
        { id: 'Fullpage React', label: 'chatflows.codes.fullpageReact' }
    ]
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
                return embedPopupHtmlCodeCustomization(chatflowid)
        }
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <div style={{ flex: 80 }}>
                    <Tabs value={value} onChange={handleChange} aria-label={t('common.labels.tabs')}>
                        {codes.map((codeLang, index) => (
                            <Tab key={index} label={t(codeLang.label)} {...a11yProps(index)}></Tab>
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
                                <Trans i18nKey='chatflows.bodyTag' components={{ c: <code /> }} />
                                <p>
                                    <Trans
                                        i18nKey='chatflows.bodyTagAlso'
                                        components={{
                                            c: <code />,
                                            a: (
                                                // eslint-disable-next-line jsx-a11y/anchor-has-content
                                                <a
                                                    rel='noreferrer'
                                                    target='_blank'
                                                    href='https://www.npmjs.com/package/flowise-embed?activeTab=versions'
                                                />
                                            )
                                        }}
                                    />
                                </p>
                            </span>
                            <div style={{ height: 10 }}></div>
                        </>
                    )}
                    <CopyBlock theme={atomOneDark} text={getCode(codeLang.id)} language='javascript' showLineNumbers={false} wrapLines />

                    <CheckboxInput
                        label={t('chatflows.actions.showChat')}
                        value={embedChatCheckboxVal}
                        onChange={onCheckBoxEmbedChatChanged}
                    />

                    {embedChatCheckboxVal && (
                        <CopyBlock
                            theme={atomOneDark}
                            text={getCodeCustomization(codeLang.id)}
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
