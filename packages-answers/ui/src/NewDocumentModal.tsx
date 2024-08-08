import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { useFlags } from 'flagsmith/react'

import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import SnackMessage from './SnackMessage'
import { useAnswers } from './AnswersContext'
import { FilterDatasources } from 'types'

interface IFormInput {
    title: string
    content: string
    source: string
    organizationId: string
}

interface ModalProps {
    title?: string
    source?: string
    onSave: (args?: any) => void
}

const NewDocumentModal: React.FC<ModalProps> = ({ title, onSave, source = 'file' }) => {
    const flags = useFlags(['organization_override'])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [theMessage, setTheMessage] = useState('')
    const [error, setError] = useState<string | null>(null)
    const { updateFilter, filters } = useAnswers()
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<IFormInput>({
        defaultValues: {
            source
        }
    })

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    const onSubmit = async (data: IFormInput) => {
        setTheMessage('Indexing your text')
        setLoading(true)
        try {
            const res = await axios.post('/api/sync/file', data)
            if (res.data) {
                const documents = (filters?.datasources?.[source as keyof FilterDatasources] as any)?.url?.sources ?? []
                updateFilter({
                    datasources: { [source]: { url: { sources: [...documents, res.data] } } }
                })
            }
            handleClose()
            onSave()
            reset()
        } catch (err: any) {
            setTheMessage(`There was an error indexing your ${source} text.`)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <SnackMessage message={theMessage} />
            <Button variant='contained' color='primary' onClick={handleOpen} fullWidth>
                {title ?? `Add ${source}`}
            </Button>
            <Modal open={open} onClose={handleClose}>
                <Paper
                    sx={{
                        width: '100%',
                        height: 'calc(100% - 32px)',
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
                        <Typography variant='h4' component='h2'>
                            {title ?? `Add ${source} document`}
                        </Typography>

                        {flags?.organization_override?.enabled ? (
                            <TextField
                                {...register('organizationId')}
                                error={Boolean(errors.organizationId)}
                                helperText={errors.organizationId?.message}
                                label='Organization Id'
                                fullWidth
                                disabled={loading}
                                margin='normal'
                            />
                        ) : null}

                        <TextField
                            {...register('title', { required: 'Title is required' })}
                            error={Boolean(errors.title)}
                            disabled={loading}
                            helperText={errors.title?.message}
                            label='Title'
                            fullWidth
                        />
                        <TextField
                            {...register('content', { required: 'Content is required' })}
                            error={Boolean(errors.content)}
                            helperText={errors.content?.message}
                            disabled={loading}
                            label='Content'
                            fullWidth
                            multiline
                            sx={{
                                flex: 1,
                                '.MuiInputBase-root': { flex: 1, alignItems: 'flex-start' },
                                '.MuiInputBase-input': {
                                    height: '100%!important',
                                    overflow: 'auto!important'
                                }
                            }}
                        />

                        {loading ? (
                            <Box display='flex' justifyContent='center' marginTop='1rem'>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Button type='submit' variant='contained' color='primary' fullWidth>
                                Add {source}
                            </Button>
                        )}
                    </Box>
                </Paper>
            </Modal>
        </div>
    )
}

export default NewDocumentModal
