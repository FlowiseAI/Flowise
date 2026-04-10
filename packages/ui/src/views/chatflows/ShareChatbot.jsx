import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import { SketchPicker } from 'react-color'
import PropTypes from 'prop-types'

import { Card, Box, Typography, Button, Switch, OutlinedInput, Popover, Stack, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Project import
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { Available } from '@/ui-component/rbac/available'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// Icons
import { IconX, IconCopy, IconArrowUpRightCircle } from '@tabler/icons-react'

// API
import chatflowsApi from '@/api/chatflows'

// utils
import useNotifier from '@/utils/useNotifier'

// Const
import { baseURL } from '@/store/constant'

// i18n
import { useTranslation } from 'react-i18next'

const defaultConfig = {
    backgroundColor: '#ffffff',
    fontSize: 16,
    poweredByTextColor: '#303235',
    titleBackgroundColor: '#3B81F6',
    titleTextColor: '#ffffff',
    botMessage: {
        backgroundColor: '#f7f8ff',
        textColor: '#303235'
    },
    userMessage: {
        backgroundColor: '#3B81F6',
        textColor: '#ffffff'
    },
    textInput: {
        backgroundColor: '#ffffff',
        textColor: '#303235',
        sendButtonColor: '#3B81F6'
    }
}

const ShareChatbot = ({ isSessionMemory, isAgentCanvas }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const theme = useTheme()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const chatbotConfig = chatflow.chatbotConfig ? JSON.parse(chatflow.chatbotConfig) : {}

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isPublicChatflow, setChatflowIsPublic] = useState(chatflow.isPublic ?? false)
    const [generateNewSession, setGenerateNewSession] = useState(chatbotConfig?.generateNewSession ?? false)
    const [renderHTML, setRenderHTML] = useState(chatbotConfig?.renderHTML ?? false)

    const [title, setTitle] = useState(chatbotConfig?.title ?? '')
    const [titleAvatarSrc, setTitleAvatarSrc] = useState(chatbotConfig?.titleAvatarSrc ?? '')
    const [titleBackgroundColor, setTitleBackgroundColor] = useState(
        chatbotConfig?.titleBackgroundColor ?? defaultConfig.titleBackgroundColor
    )
    const [titleTextColor, setTitleTextColor] = useState(chatbotConfig?.titleTextColor ?? defaultConfig.titleTextColor)

    const [welcomeMessage, setWelcomeMessage] = useState(chatbotConfig?.welcomeMessage ?? '')
    const [errorMessage, setErrorMessage] = useState(chatbotConfig?.errorMessage ?? '')
    const [backgroundColor, setBackgroundColor] = useState(chatbotConfig?.backgroundColor ?? defaultConfig.backgroundColor)
    const [fontSize, setFontSize] = useState(chatbotConfig?.fontSize ?? defaultConfig.fontSize)
    const [poweredByTextColor, setPoweredByTextColor] = useState(chatbotConfig?.poweredByTextColor ?? defaultConfig.poweredByTextColor)

    const getShowAgentMessagesStatus = () => {
        if (chatbotConfig?.showAgentMessages !== undefined) {
            return chatbotConfig?.showAgentMessages
        } else {
            return isAgentCanvas ? true : undefined
        }
    }
    const [showAgentMessages, setShowAgentMessages] = useState(getShowAgentMessagesStatus())

    const [botMessageBackgroundColor, setBotMessageBackgroundColor] = useState(
        chatbotConfig?.botMessage?.backgroundColor ?? defaultConfig.botMessage.backgroundColor
    )
    const [botMessageTextColor, setBotMessageTextColor] = useState(
        chatbotConfig?.botMessage?.textColor ?? defaultConfig.botMessage.textColor
    )
    const [botMessageAvatarSrc, setBotMessageAvatarSrc] = useState(chatbotConfig?.botMessage?.avatarSrc ?? '')
    const [botMessageShowAvatar, setBotMessageShowAvatar] = useState(chatbotConfig?.botMessage?.showAvatar ?? false)

    const [userMessageBackgroundColor, setUserMessageBackgroundColor] = useState(
        chatbotConfig?.userMessage?.backgroundColor ?? defaultConfig.userMessage.backgroundColor
    )
    const [userMessageTextColor, setUserMessageTextColor] = useState(
        chatbotConfig?.userMessage?.textColor ?? defaultConfig.userMessage.textColor
    )
    const [userMessageAvatarSrc, setUserMessageAvatarSrc] = useState(chatbotConfig?.userMessage?.avatarSrc ?? '')
    const [userMessageShowAvatar, setUserMessageShowAvatar] = useState(chatbotConfig?.userMessage?.showAvatar ?? false)

    const [textInputBackgroundColor, setTextInputBackgroundColor] = useState(
        chatbotConfig?.textInput?.backgroundColor ?? defaultConfig.textInput.backgroundColor
    )
    const [textInputTextColor, setTextInputTextColor] = useState(chatbotConfig?.textInput?.textColor ?? defaultConfig.textInput.textColor)
    const [textInputPlaceholder, setTextInputPlaceholder] = useState(chatbotConfig?.textInput?.placeholder ?? '')
    const [textInputSendButtonColor, setTextInputSendButtonColor] = useState(
        chatbotConfig?.textInput?.sendButtonColor ?? defaultConfig.textInput.sendButtonColor
    )

    const [colorAnchorEl, setColorAnchorEl] = useState(null)
    const [selectedColorConfig, setSelectedColorConfig] = useState('')
    const [sketchPickerColor, setSketchPickerColor] = useState('')
    const openColorPopOver = Boolean(colorAnchorEl)

    const [copyAnchorEl, setCopyAnchorEl] = useState(null)
    const openCopyPopOver = Boolean(copyAnchorEl)

    const formatObj = () => {
        const obj = {
            botMessage: {
                showAvatar: false
            },
            userMessage: {
                showAvatar: false
            },
            textInput: {}
        }
        if (title) obj.title = title
        if (titleAvatarSrc) obj.titleAvatarSrc = titleAvatarSrc
        if (titleBackgroundColor) obj.titleBackgroundColor = titleBackgroundColor
        if (titleTextColor) obj.titleTextColor = titleTextColor

        if (welcomeMessage) obj.welcomeMessage = welcomeMessage
        if (errorMessage) obj.errorMessage = errorMessage
        if (backgroundColor) obj.backgroundColor = backgroundColor
        if (fontSize) obj.fontSize = fontSize
        if (poweredByTextColor) obj.poweredByTextColor = poweredByTextColor

        if (botMessageBackgroundColor) obj.botMessage.backgroundColor = botMessageBackgroundColor
        if (botMessageTextColor) obj.botMessage.textColor = botMessageTextColor
        if (botMessageAvatarSrc) obj.botMessage.avatarSrc = botMessageAvatarSrc
        if (botMessageShowAvatar) obj.botMessage.showAvatar = botMessageShowAvatar

        if (userMessageBackgroundColor) obj.userMessage.backgroundColor = userMessageBackgroundColor
        if (userMessageTextColor) obj.userMessage.textColor = userMessageTextColor
        if (userMessageAvatarSrc) obj.userMessage.avatarSrc = userMessageAvatarSrc
        if (userMessageShowAvatar) obj.userMessage.showAvatar = userMessageShowAvatar

        if (textInputBackgroundColor) obj.textInput.backgroundColor = textInputBackgroundColor
        if (textInputTextColor) obj.textInput.textColor = textInputTextColor
        if (textInputPlaceholder) obj.textInput.placeholder = textInputPlaceholder
        if (textInputSendButtonColor) obj.textInput.sendButtonColor = textInputSendButtonColor

        if (isSessionMemory) obj.generateNewSession = generateNewSession

        if (renderHTML) {
            obj.renderHTML = true
        } else {
            obj.renderHTML = false
        }

        if (isAgentCanvas) {
            // if showAgentMessages is undefined, default to true
            if (showAgentMessages === undefined || showAgentMessages === null) {
                obj.showAgentMessages = true
            } else {
                obj.showAgentMessages = showAgentMessages
            }
        }

        return {
            ...chatbotConfig,
            ...obj
        }
    }

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, {
                chatbotConfig: JSON.stringify(formatObj())
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('chatflows.messages.save.success'),
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            enqueueSnackbar({
                message: t('chatflows.messages.save.error', {
                    msg: typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }),
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const onSwitchChange = async (checked) => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, { isPublic: checked })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('chatflows.messages.save.success'),
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            enqueueSnackbar({
                message: t('chatflows.messages.save.error', {
                    msg: typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }),
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const handleClosePopOver = () => {
        setColorAnchorEl(null)
    }

    const handleCloseCopyPopOver = () => {
        setCopyAnchorEl(null)
    }

    const onColorSelected = (hexColor) => {
        switch (selectedColorConfig) {
            case 'backgroundColor':
                setBackgroundColor(hexColor)
                break
            case 'poweredByTextColor':
                setPoweredByTextColor(hexColor)
                break
            case 'botMessageBackgroundColor':
                setBotMessageBackgroundColor(hexColor)
                break
            case 'botMessageTextColor':
                setBotMessageTextColor(hexColor)
                break
            case 'userMessageBackgroundColor':
                setUserMessageBackgroundColor(hexColor)
                break
            case 'userMessageTextColor':
                setUserMessageTextColor(hexColor)
                break
            case 'textInputBackgroundColor':
                setTextInputBackgroundColor(hexColor)
                break
            case 'textInputTextColor':
                setTextInputTextColor(hexColor)
                break
            case 'textInputSendButtonColor':
                setTextInputSendButtonColor(hexColor)
                break
            case 'titleBackgroundColor':
                setTitleBackgroundColor(hexColor)
                break
            case 'titleTextColor':
                setTitleTextColor(hexColor)
                break
        }
        setSketchPickerColor(hexColor)
    }

    const onTextChanged = (value, fieldName) => {
        switch (fieldName) {
            case 'title':
                setTitle(value)
                break
            case 'titleAvatarSrc':
                setTitleAvatarSrc(value)
                break
            case 'welcomeMessage':
                setWelcomeMessage(value)
                break
            case 'errorMessage':
                setErrorMessage(value)
                break
            case 'fontSize':
                setFontSize(value)
                break
            case 'botMessageAvatarSrc':
                setBotMessageAvatarSrc(value)
                break
            case 'userMessageAvatarSrc':
                setUserMessageAvatarSrc(value)
                break
            case 'textInputPlaceholder':
                setTextInputPlaceholder(value)
                break
        }
    }

    const onBooleanChanged = (value, fieldName) => {
        switch (fieldName) {
            case 'botMessageShowAvatar':
                setBotMessageShowAvatar(value)
                break
            case 'userMessageShowAvatar':
                setUserMessageShowAvatar(value)
                break
            case 'generateNewSession':
                setGenerateNewSession(value)
                break
            case 'showAgentMessages':
                setShowAgentMessages(value)
                break
            case 'renderHTML':
                setRenderHTML(value)
                break
        }
    }

    const colorField = (color, fieldName, fieldLabel) => {
        return (
            <Box sx={{ pt: 2, pb: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography sx={{ mb: 1 }}>{fieldLabel}</Typography>
                    <Box
                        sx={{
                            cursor: 'pointer',
                            width: '30px',
                            height: '30px',
                            border: '1px solid #616161',
                            marginRight: '10px',
                            backgroundColor: color ?? '#ffffff',
                            borderRadius: '5px'
                        }}
                        onClick={(event) => {
                            setSelectedColorConfig(fieldName)
                            setSketchPickerColor(color ?? '#ffffff')
                            setColorAnchorEl(event.currentTarget)
                        }}
                    ></Box>
                </div>
            </Box>
        )
    }

    const booleanField = (value, fieldName, fieldLabel) => {
        return (
            <Box sx={{ pt: 2, pb: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography sx={{ mb: 1 }}>{fieldLabel}</Typography>
                    <Switch
                        id={fieldName}
                        checked={value}
                        onChange={(event) => {
                            onBooleanChanged(event.target.checked, fieldName)
                        }}
                    />
                </div>
            </Box>
        )
    }

    const textField = (message, fieldName, fieldLabel, fieldType = 'string', placeholder = '') => {
        return (
            <Box sx={{ pt: 2, pb: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography sx={{ mb: 1 }}>{fieldLabel}</Typography>
                    <OutlinedInput
                        id={fieldName}
                        type={fieldType}
                        fullWidth
                        value={message}
                        placeholder={placeholder}
                        name={fieldName}
                        onChange={(e) => {
                            onTextChanged(e.target.value, fieldName)
                        }}
                    />
                </div>
            </Box>
        )
    }

    return (
        <>
            <Stack direction='row'>
                <Typography
                    sx={{
                        p: 1,
                        borderRadius: 10,
                        backgroundColor: theme.palette.primary.light,
                        width: 'max-content',
                        height: 'max-content'
                    }}
                    variant='h5'
                >
                    {`${baseURL}/chatbot/${chatflowid}`}
                </Typography>
                <IconButton
                    title={t('chatflows.actions.copyLink')}
                    color='success'
                    onClick={(event) => {
                        navigator.clipboard.writeText(`${baseURL}/chatbot/${chatflowid}`)
                        setCopyAnchorEl(event.currentTarget)
                        setTimeout(() => {
                            handleCloseCopyPopOver()
                        }, 1500)
                    }}
                >
                    <IconCopy />
                </IconButton>
                <IconButton
                    title={t('chatflows.actions.openNewTab')}
                    color='primary'
                    onClick={() => window.open(`${baseURL}/chatbot/${chatflowid}`, '_blank')}
                >
                    <IconArrowUpRightCircle />
                </IconButton>
                <div style={{ flex: 1 }} />
                <Available permission={'chatflows:update,agentflows:update'}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                            checked={isPublicChatflow}
                            onChange={(event) => {
                                setChatflowIsPublic(event.target.checked)
                                onSwitchChange(event.target.checked)
                            }}
                        />
                        <Typography>{t('chatflows.actions.makePublic.title')}</Typography>
                        <TooltipWithParser style={{ marginLeft: 10 }} title={t('chatflows.actions.makePublic.tooltip')} />
                    </div>
                </Available>
            </Stack>

            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 3, mt: 2 }} variant='outlined'>
                <Stack sx={{ mt: 1, mb: 2, alignItems: 'center' }} direction='row' spacing={2}>
                    <Typography variant='h4'>{t('chatflows.cards.titleSettings')}</Typography>
                </Stack>
                {textField(title, 'title', t('chatflows.inputs.title.title'), 'string', t('chatflows.inputs.title.placeholder'))}
                {textField(
                    titleAvatarSrc,
                    'titleAvatarSrc',
                    t('chatflows.inputs.titleAvatarSrc.title'),
                    'string',
                    `https://raw.githubusercontent.com/FlowiseAI/Flowise/main/assets/FloWiseAI_dark.png`
                )}
                {colorField(titleBackgroundColor, 'titleBackgroundColor', t('chatflows.inputs.titleBackgroundColor.title'))}
                {colorField(titleTextColor, 'titleTextColor', t('chatflows.inputs.titleTextColor.title'))}
            </Card>

            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 3, mt: 2 }} variant='outlined'>
                <Stack sx={{ mt: 1, mb: 2, alignItems: 'center' }} direction='row' spacing={2}>
                    <Typography variant='h4'>{t('chatflows.cards.generalSettings')}</Typography>
                </Stack>
                {textField(
                    welcomeMessage,
                    'welcomeMessage',
                    t('chatflows.inputs.welcomeMessage.title'),
                    'string',
                    t('chatflows.inputs.welcomeMessage.placeholder')
                )}
                {textField(
                    errorMessage,
                    'errorMessage',
                    t('chatflows.inputs.errorMessage.title'),
                    'string',
                    t('chatflows.inputs.errorMessage.placeholder')
                )}
                {colorField(backgroundColor, 'backgroundColor', t('chatflows.inputs.backgroundColor.title'))}
                {textField(fontSize, 'fontSize', t('chatflows.inputs.fontSize.title'), 'number')}
                {colorField(poweredByTextColor, 'poweredByTextColor', t('chatflows.inputs.poweredByTextColor.title'))}
                {isAgentCanvas && booleanField(showAgentMessages, 'showAgentMessages', t('chatflows.inputs.showAgentMessages.title'))}
                {booleanField(renderHTML, 'renderHTML', t('chatflows.inputs.renderHTML.title'))}
                {isSessionMemory && booleanField(generateNewSession, 'generateNewSession', t('chatflows.inputs.generateNewSession.title'))}
            </Card>

            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 3, mt: 2 }} variant='outlined'>
                <Stack sx={{ mt: 1, mb: 2, alignItems: 'center' }} direction='row' spacing={2}>
                    <Typography variant='h4'>{t('chatflows.cards.botMessage')}</Typography>
                </Stack>
                {colorField(botMessageBackgroundColor, 'botMessageBackgroundColor', t('chatflows.inputs.backgroundColor.title'))}
                {colorField(botMessageTextColor, 'botMessageTextColor', t('chatflows.inputs.textColor.title'))}
                {textField(
                    botMessageAvatarSrc,
                    'botMessageAvatarSrc',
                    t('chatflows.inputs.avatarSrc.title'),
                    'string',
                    `https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png`
                )}
                {booleanField(botMessageShowAvatar, 'botMessageShowAvatar', t('chatflows.inputs.showAvatar.title'))}
            </Card>

            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 3, mt: 2 }} variant='outlined'>
                <Stack sx={{ mt: 1, mb: 2, alignItems: 'center' }} direction='row' spacing={2}>
                    <Typography variant='h4'>{t('chatflows.cards.userMessage')}</Typography>
                </Stack>
                {colorField(userMessageBackgroundColor, 'userMessageBackgroundColor', t('chatflows.inputs.backgroundColor.title'))}
                {colorField(userMessageTextColor, 'userMessageTextColor', t('chatflows.inputs.textColor.title'))}
                {textField(
                    userMessageAvatarSrc,
                    'userMessageAvatarSrc',
                    t('chatflows.inputs.avatarSrc.title'),
                    'string',
                    `https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png`
                )}
                {booleanField(userMessageShowAvatar, 'userMessageShowAvatar', t('chatflows.inputs.showAvatar.title'))}
            </Card>

            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 3, mt: 2 }} variant='outlined'>
                <Stack sx={{ mt: 1, mb: 2, alignItems: 'center' }} direction='row' spacing={2}>
                    <Typography variant='h4'>{t('chatflows.cards.textInput')}</Typography>
                </Stack>
                {colorField(textInputBackgroundColor, 'textInputBackgroundColor', t('chatflows.inputs.backgroundColor.title'))}
                {colorField(textInputTextColor, 'textInputTextColor', t('chatflows.inputs.textColor.title'))}
                {textField(
                    textInputPlaceholder,
                    'textInputPlaceholder',
                    t('chatflows.inputs.textInputPlaceholder.title'),
                    'string',
                    t('chatflows.inputs.textInputPlaceholder.placeholder')
                )}
                {colorField(textInputSendButtonColor, 'textInputSendButtonColor', t('chatflows.inputs.textInputSendButtonColor.title'))}
            </Card>

            <StyledPermissionButton
                permissionId={'chatflows:update,agentflows:update'}
                fullWidth
                style={{
                    borderRadius: 20,
                    marginBottom: 10,
                    marginTop: 10,
                    background: 'linear-gradient(45deg, #673ab7 30%, #1e88e5 90%)'
                }}
                variant='contained'
                onClick={() => onSave()}
            >
                {t('chatflows.actions.saveChanges')}
            </StyledPermissionButton>
            <Popover
                open={openColorPopOver}
                anchorEl={colorAnchorEl}
                onClose={handleClosePopOver}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
            >
                <SketchPicker color={sketchPickerColor} onChange={(color) => onColorSelected(color.hex)} />
            </Popover>
            <Popover
                open={openCopyPopOver}
                anchorEl={copyAnchorEl}
                onClose={handleCloseCopyPopOver}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
            >
                <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: theme.palette.success.dark }}>
                    {t('chatflows.copied')}
                </Typography>
            </Popover>
        </>
    )
}

ShareChatbot.propTypes = {
    isSessionMemory: PropTypes.bool,
    isAgentCanvas: PropTypes.bool
}

export default ShareChatbot
