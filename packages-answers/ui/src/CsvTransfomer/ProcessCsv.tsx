'use client'
import { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Controller, useForm } from 'react-hook-form'

// material-ui
import {
    Stack,
    Box,
    Button,
    Typography,
    Chip,
    Card,
    TextField,
    MenuItem,
    useTheme,
    FormControlLabel,
    FormLabel,
    FormControl,
    FormGroup,
    Checkbox,
    Switch,
    IconButton,
    Snackbar,
    Backdrop,
    CircularProgress
} from '@mui/material'
import { User } from 'types'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import FilePresentOutlined from '@mui/icons-material/FilePresentOutlined'

import { createCsvParseRun } from './actions'

const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 2,
    borderStyle: 'dashed',
    outline: 'none',
    transition: 'border .24s ease-in-out'
}

interface IFormInput {
    name: string
    processorId: string
    rowsRequested: number
    context: string
    sourceColumns: string[]
    includeOriginalColumns: boolean
}

const ProcessCsv = ({ chatflows, user }: { chatflows: any[]; user: User }) => {
    const theme = useTheme()
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<string[][]>([])
    const [file, setFile] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')

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
            name: '',
            processorId: '',
            rowsRequested: 0,
            context: '',
            sourceColumns: [],
            includeOriginalColumns: true
        }
    })

    // drag & drop and file input
    const onDrop = useCallback((acceptedFiles: any) => {
        // Do something with the files
        const file = acceptedFiles[0]
        setFile(file)
        setFileName(file.name)
        const reader = new FileReader()

        reader.onload = (event) => {
            if (reader.result?.toString().startsWith('data')) {
                setFile(reader.result?.toString())
            } else {
                const content = event.target?.result as string
                // Parse CSV content
                const lines = content
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .map((line) => line.split(',').map((cell) => cell.trim()))
                const [headers, ...rows] = lines
                setHeaders(headers)
                setRows(rows)
                reader.readAsDataURL(file)
            }
        }
        reader.readAsText(file)
    }, [])

    const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    const style = useMemo(
        () => ({
            ...{
                ...baseStyle,
                backgroundColor: theme.palette.grey[50],
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                padding: theme.spacing(4),
                cursor: 'pointer'
            },
            ...(isFocused ? { borderColor: theme.palette.secondary.main } : {}),
            ...(isDragAccept ? { borderColor: theme.palette.primary.main } : {}),
            ...(isDragReject ? { borderColor: theme.palette.error.main } : {})
        }),
        [isFocused, isDragAccept, isDragReject]
    )

    const handleClearFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        reset()
        setFileName(null)
        setHeaders([])
        setRows([])
        setFile(null)
    }

    const handleProcessCsv = async (data: IFormInput) => {
        try {
            setLoading(true)
            const indexToCol = new Map<number, string>()
            data.sourceColumns?.forEach((col: string) => {
                const index = headers.indexOf(col)
                if (index !== -1) {
                    indexToCol.set(index, col)
                }
            })

            await createCsvParseRun({
                userId: user.id,
                orgId: user.org_id,
                name: data.name,
                configuration: {
                    context: data.context,
                    sourceColumns: Object.fromEntries(indexToCol.entries())
                },
                chatflowChatId: data.processorId,
                rowsRequested: Number(data.rowsRequested),
                file: file,
                includeOriginalColumns: data.includeOriginalColumns
            })
            setSnackbarMessage('Your CSV is being processed.')
            setSnackbarOpen(true)
            reset()
            setFileName(null)
            setHeaders([])
            setRows([])
            setFile(null)
        } catch (err) {
            console.log(err)
            setSnackbarMessage('There was an error processing your CSV.')
            setSnackbarOpen(true)
        } finally {
            setLoading(false)
        }
    }

    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return
        }
        setSnackbarOpen(false)
    }

    return (
        <Stack flexDirection='column' sx={{ gap: 4 }} component='form' onSubmit={handleSubmit(handleProcessCsv)}>
            {loading && (
                <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open>
                    <CircularProgress color='inherit' />
                </Backdrop>
            )}
            {/* @ts-ignore */}
            <Box {...getRootProps({ style })}>
                <input {...getInputProps()} />
                {fileName ? (
                    <Stack flexDirection='row' alignItems='center' justifyContent='space-between' gap={1}>
                        <FilePresentOutlined sx={{ background: 'transparent', color: theme.palette.primary.main }} />
                        <Typography>{fileName}</Typography>
                        <IconButton onClick={handleClearFile}>
                            <CloseOutlined sx={{ background: 'transparent', color: theme.palette.primary.main }} />
                        </IconButton>
                    </Stack>
                ) : (
                    <Typography>{"Drag 'n' drop a CSV file here, or click to select a file"}</Typography>
                )}
            </Box>
            {!!headers?.length && (
                <Stack flexDirection='column' sx={{ gap: 2 }}>
                    <Stack flexDirection='row' justifyContent='space-between' sx={{ gap: 2 }}>
                        <Typography variant='h3'>Original Columns</Typography>
                        <Controller
                            name='includeOriginalColumns'
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={<Switch {...field} defaultChecked={true} color='secondary' />}
                                    label='Include in output'
                                />
                            )}
                        />
                    </Stack>
                    <Stack flexDirection='row' sx={{ gap: 2 }}>
                        {headers.map((header) => (
                            <Chip key={header} label={header} variant='filled' color='primary' />
                        ))}
                    </Stack>
                </Stack>
            )}
            {!!headers?.length && (
                <Stack flexDirection='column' sx={{ gap: 2 }}>
                    <Typography variant='h3'>AI Processing</Typography>
                    <Card variant='outlined' sx={{ p: 2 }}>
                        <Stack sx={{ gap: 2 }}>
                            <Controller
                                name='name'
                                control={control}
                                defaultValue=''
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Instance name'
                                        fullWidth
                                        variant='outlined'
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    />
                                )}
                            />
                            <Controller
                                name='processorId'
                                control={control}
                                defaultValue=''
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='AI Processor'
                                        fullWidth
                                        variant='outlined'
                                        select
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                    >
                                        {chatflows.map((chatflow) => (
                                            <MenuItem key={chatflow.id} value={chatflow.id}>
                                                {chatflow.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                            <Controller
                                name='rowsRequested'
                                control={control}
                                defaultValue={rows?.length}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Number of rows to process'
                                        type='number'
                                        inputProps={{ max: rows?.length ?? 0 }}
                                        fullWidth
                                        variant='outlined'
                                        error={!!errors.rowsRequested}
                                        helperText={errors.rowsRequested?.message ?? `Total rows: ${rows?.length}`}
                                    />
                                )}
                            />
                            <Controller
                                name='sourceColumns'
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <FormControl sx={{ flex: 1 }} component='fieldset' variant='standard'>
                                        <FormLabel component='legend'>Source Columns</FormLabel>
                                        <FormGroup>
                                            {headers.map((header) => (
                                                <FormControlLabel
                                                    key={header}
                                                    control={
                                                        <Checkbox
                                                            checked={value.includes(header)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    onChange([...value, header])
                                                                } else {
                                                                    onChange(value.filter((col: string) => col !== header))
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={header}
                                                />
                                            ))}
                                        </FormGroup>
                                    </FormControl>
                                )}
                            />
                            <Controller
                                name='context'
                                control={control}
                                defaultValue=''
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Additional context'
                                        placeholder='Enter any additional context or instructions for the AI processor...'
                                        minRows={3}
                                        multiline
                                        fullWidth
                                        variant='outlined'
                                        error={!!errors.context}
                                        helperText={errors.context?.message}
                                    />
                                )}
                            />
                        </Stack>
                    </Card>
                </Stack>
            )}
            <Button variant='contained' startIcon={<DownloadOutlined sx={{ background: 'transparent' }} />} type='submit'>
                Process and Download AI-Enhanced CSV
            </Button>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            />
        </Stack>
    )
}

export default ProcessCsv
