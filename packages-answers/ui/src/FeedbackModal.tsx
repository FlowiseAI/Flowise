'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import axios from 'axios'
import { Rating } from 'db/generated/prisma-client'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

import { MessageFeedback } from 'types'
import { FormControlLabel, Checkbox } from '@mui/material'

interface IFormInput extends Partial<MessageFeedback> {}

interface ModalProps {
    messageId: string
    rating: Rating
    onSave?: (args?: any) => void
    onClose?: () => void
}

const reasonsForPositiveFeedback: string[] = []
const reasonsForFeedback: string[] = ['This is not helpful', 'This is not true', 'This is not appropiate']

const ShareModal: React.FC<ModalProps> = ({ messageId, rating, onSave, onClose }) => {
    const router = useRouter()

    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)

    const {
        control,
        handleSubmit,
        clearErrors,
        setValue,
        formState: { errors, isValid },
        setError,
        reset
    } = useForm<IFormInput>({
        defaultValues: {
            rating,
            messageId,
            tags: []
        }
    })

    const handleClose = () => {
        if (onClose) onClose()
        setOpen(false)
    }

    const onSubmit = async (data: IFormInput) => {
        setLoading(true)
        try {
            await axios.post(`/api/chats/message_feedback`, {
                ...data
            })
            reset()
            if (onClose) onClose()
        } catch (err: any) {
            console.error(err)
            // Display error to user or handle it appropriately
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={handleClose}>
            <Paper
                sx={{
                    width: '100%',
                    maxWidth: 800,
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
                            Provide additional feedback
                        </Typography>
                        <IconButton sx={{ position: 'absolute', top: 8, right: 8 }} onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, width: '100%', flexDirection: 'column' }}>
                        <Controller
                            name='content'
                            control={control}
                            defaultValue=''
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    placeholder={`What did you ${rating == 'thumbsUp' ? 'like' : 'dislike'} about this response?`}
                                    multiline
                                    rows={6}
                                    fullWidth
                                    variant='outlined'
                                    error={!!errors.content}
                                    helperText={errors.content?.message}
                                />
                            )}
                        />

                        <Controller
                            name='tags'
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    {(rating == 'thumbsUp' ? reasonsForPositiveFeedback : reasonsForFeedback).map((reason) => (
                                        <FormControlLabel
                                            key={reason}
                                            control={
                                                <Checkbox
                                                    size='small'
                                                    {...field}
                                                    value={reason}
                                                    checked={field?.value?.includes(reason)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            field.onChange([...field.value!, e.target.value])
                                                        } else {
                                                            field.onChange(field?.value?.filter((val) => val !== e.target.value))
                                                        }
                                                    }}
                                                />
                                            }
                                            label={reason}
                                        />
                                    ))}
                                    {errors.tags && <span style={{ color: 'red' }}>{errors.tags.message}</span>}
                                </Box>
                            )}
                        />

                        <Button variant='contained' disabled={!isValid} type='submit' sx={{ maxHeight: 50 }}>
                            Submit feedback
                        </Button>
                    </Box>
                </Box>

                {loading ? <LinearProgress variant='query' sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} /> : null}
            </Paper>
        </Modal>
    )
}

export default ShareModal
