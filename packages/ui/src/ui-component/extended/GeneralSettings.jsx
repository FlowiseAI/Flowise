import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import chatflowsApi from '@/api/chatflows'
import { SET_CHATFLOW } from '@/store/actions'
import TagInput from '@/ui-component/input/TagInput'

const DISPLAY_MODES = {
    CHATBOT: 'chatbot',
    EMBEDDED_FORM: 'embeddedForm'
}

const GeneralSettings = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [categories, setCategories] = useState([])
    const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.CHATBOT)
    const [embeddedUrl, setEmbeddedUrl] = useState('')

    useEffect(() => {
        if (dialogProps?.chatflow) {
            setTitle(dialogProps.chatflow.name || '')
            setDescription(dialogProps.chatflow.description || '')
            setCategories(dialogProps.chatflow.category ? dialogProps.chatflow.category.split(';') : [])

            // Parse chatbotConfig to get displayMode and embeddedUrl
            const chatbotConfig = dialogProps.chatflow.chatbotConfig ? JSON.parse(dialogProps.chatflow.chatbotConfig) : {}
            setDisplayMode(chatbotConfig?.displayMode || DISPLAY_MODES.CHATBOT)
            setEmbeddedUrl(chatbotConfig?.embeddedUrl || '')
        }
    }, [dialogProps])

    const handleSave = async () => {
        try {
            const chatbotConfig = {
                displayMode,
                embeddedUrl
            }

            if (!dialogProps.chatflow.id && dialogProps.handleSaveFlow) {
                return dialogProps.handleSaveFlow(title || dialogProps.chatflow.name, {
                    description,
                    category: categories.join(';'),
                    chatbotConfig: JSON.stringify(chatbotConfig)
                })
            }

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                name: title,
                description: description,
                category: categories.join(';'),
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
                dispatch(
                    enqueueSnackbarAction({
                        message: 'Chatflow settings updated successfully',
                        options: { variant: 'success' }
                    })
                )
            }
        } catch (error) {
            console.error(error)
            dispatch(
                enqueueSnackbarAction({
                    message: 'Failed to update chatflow settings',
                    options: { variant: 'error' }
                })
            )
        }
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant='h4' gutterBottom>
                General Settings
            </Typography>
            <TextField fullWidth label='Chatflow Title' value={title} onChange={(e) => setTitle(e.target.value)} margin='normal' />
            <TextField
                fullWidth
                label='Description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                margin='normal'
                multiline
                rows={4}
            />
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom>
                    Categories
                </Typography>
                <TagInput categories={categories} onChange={setCategories} />
            </Box>
            <Box sx={{ mt: 2 }}>
                <Typography variant='subtitle1' gutterBottom>
                    Display Mode
                </Typography>
                <Select fullWidth value={displayMode} onChange={(e) => setDisplayMode(e.target.value)}>
                    <MenuItem value={DISPLAY_MODES.CHATBOT}>Chatbot</MenuItem>
                    <MenuItem value={DISPLAY_MODES.EMBEDDED_FORM}>Embedded Form</MenuItem>
                </Select>
            </Box>
            {displayMode === DISPLAY_MODES.EMBEDDED_FORM && (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label='Embedded URL'
                        value={embeddedUrl}
                        onChange={(e) => setEmbeddedUrl(e.target.value)}
                        margin='normal'
                    />
                </Box>
            )}
            <Button variant='contained' color='primary' onClick={handleSave} sx={{ mt: 2 }}>
                Save
            </Button>
        </Box>
    )
}

GeneralSettings.propTypes = {
    dialogProps: PropTypes.shape({
        chatflow: PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string,
            description: PropTypes.string,
            category: PropTypes.string,
            chatbotConfig: PropTypes.string
        }).isRequired,
        handleSaveFlow: PropTypes.func
    }).isRequired
}

export default GeneralSettings
