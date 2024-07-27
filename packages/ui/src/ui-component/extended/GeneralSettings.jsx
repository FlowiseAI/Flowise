import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import chatflowsApi from '@/api/chatflows'
import { SET_CHATFLOW } from '@/store/actions'
import TagInput from '@/ui-component/input/TagInput'

const GeneralSettings = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [categories, setCategories] = useState([])

    useEffect(() => {
        if (dialogProps?.chatflow) {
            setTitle(dialogProps.chatflow.name || '')
            setDescription(dialogProps.chatflow.description || '')
            setCategories(dialogProps.chatflow.category ? dialogProps.chatflow.category.split(';') : [])
        }
    }, [dialogProps])

    const handleSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                name: title,
                description: description,
                category: categories.join(';')
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
            category: PropTypes.string
        }).isRequired
    }).isRequired
}

export default GeneralSettings
