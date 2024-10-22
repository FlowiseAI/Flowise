'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import axios from 'axios'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Snackbar from '@mui/material/Snackbar'

import { useAnswers } from './AnswersContext'

import { User } from 'types'
import { baseURL } from '@/store/constant'

interface IFormInput {
    chatId: string
    email: string[]
    users: User[]
}

interface ModalProps {
    title?: string
    source?: string
    onSave?: (args?: any) => void
    onClose?: () => void
    templateId?: string
}

const ShareModal: React.FC<ModalProps> = ({ title, onSave, onClose, source = 'file', templateId }) => {
    const router = useRouter()
    const { chat } = useAnswers()
    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')

    const {
        control,
        handleSubmit,
        clearErrors,
        setValue,
        formState: { isValid },
        setError,
        reset
    } = useForm<IFormInput>({
        defaultValues: {
            chatId: chat?.id
        }
    })

    const handleOpen = () => setOpen(true)
    const handleClose = () => {
        if (onClose) onClose()
        setOpen(false)
    }

    const onSubmit = async (data: IFormInput) => {
        setLoading(true)
        try {
            await axios.post(`/api/chats/${chat?.id}/share`, {
                ...data,
                email: [...(chat?.users?.map((user: User) => user.email) ?? []), ...data.email]
            })
            reset()
            router.refresh()
        } catch (err: any) {
            setError('email', { message: err.message ?? 'There was an error, please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const onDelete = async (email: string) => {
        setLoading(true)
        try {
            await axios.patch('/api/chats/share', {
                chatId: chat?.id!,
                email: chat?.users?.filter((user: User) => user.email !== email)?.map((user: User) => user.email)
            })

            router.refresh()
        } catch (err: any) {
            setError('email', { message: err.message ?? 'There was an error, please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleCopyMarketplaceLink = () => {
        if (templateId) {
            const encodedDomain = Buffer.from(baseURL).toString('base64')
            const shareUrl = `${window.location.origin}/org/${encodedDomain}/marketplace/${templateId}`
            navigator.clipboard.writeText(shareUrl)
            setSnackbarMessage('Marketplace link copied to clipboard')
            setSnackbarOpen(true)
        }
    }

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return
        }
        setSnackbarOpen(false)
    }

    return (
        <Modal open={open} onClose={handleClose}>
            <Paper
                sx={{
                    width: '100%',
                    maxWidth: 500,
                    padding: 2,
                    backgroundColor: 'background.paper',
                    margin: 'auto',
                    outline: 'none',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Box
                    component='form'
                    onSubmit={handleSubmit(onSubmit)}
                    sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}
                >
                    <Box>
                        <Typography variant='h5' component='h3'>
                            Share this chat
                        </Typography>
                        <Typography>Invite teammates to collaborate together</Typography>
                        <IconButton sx={{ position: 'absolute', top: 8, right: 8 }} onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Controller
                            control={control}
                            rules={{
                                required: 'Enter at least one email.'
                            }}
                            name='email'
                            render={({ formState: { errors }, field: { onBlur, value, ref } }) => (
                                <Autocomplete
                                    options={[]}
                                    multiple
                                    freeSolo
                                    fullWidth
                                    placeholder='Email, comma separated'
                                    onBlur={onBlur}
                                    value={value ?? []}
                                    ref={ref}
                                    onChange={(event, value) => {
                                        if (value.some((email: string) => !/\S+@\S+\.\S+/.test(email))) {
                                            setError('email', { message: 'Enter valid emails' })
                                        } else {
                                            clearErrors('email')
                                        }

                                        setValue('email', value, { shouldDirty: true })
                                    }}
                                    renderInput={({ inputProps: { ...inputProps }, ...params }) => (
                                        <TextField
                                            {...params}
                                            inputProps={inputProps}
                                            label='Email'
                                            error={Boolean(errors.email)}
                                            helperText={errors.email?.message}
                                        />
                                    )}
                                />
                            )}
                        />

                        <Button variant='contained' disabled={!isValid} type='submit' sx={{ maxHeight: 50 }}>
                            Invite
                        </Button>
                    </Box>

                    {templateId && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant='body2'>Share marketplace link:</Typography>
                            <IconButton onClick={handleCopyMarketplaceLink} size='small'>
                                <ContentCopyIcon fontSize='small' />
                            </IconButton>
                        </Box>
                    )}

                    <Box>
                        <List dense>
                            {chat?.users?.map((user) => (
                                <ListItem
                                    key={user?.id}
                                    disablePadding
                                    secondaryAction={
                                        chat.ownerId !== user.id ? (
                                            <IconButton edge='end' aria-label='delete' onClick={() => onDelete(user.email!)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        ) : (
                                            <Typography variant='overline'>owner</Typography>
                                        )
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar src={user?.image!} />
                                    </ListItemAvatar>
                                    <ListItemText primary={user?.name} secondary={user?.email} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Box>

                {loading ? <LinearProgress variant='query' sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} /> : null}
            </Paper>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Modal>
    )
}

export default ShareModal
