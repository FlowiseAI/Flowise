import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Controller, useForm } from 'react-hook-form'
import { InputLabel, Select, MenuItem } from '@mui/material'

// material-ui
import {
    Stack,
    Box,
    Button,
    Typography,
    Chip,
    Card,
    TextField,
    useTheme,
    FormControlLabel,
    FormControl,
    Switch,
    IconButton,
    Snackbar,
    Backdrop,
    CircularProgress,
    FormHelperText,
    Stepper,
    Step,
    StepLabel
} from '@mui/material'
import { User } from 'types'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import FilePresentOutlined from '@mui/icons-material/FilePresentOutlined'

import { createCsvParseRun, fetchCsvParseRun, cloneCsvParseRun } from './actions'

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

const ProcessCsv = ({ chatflows, user, onNavigateToHistory }: { chatflows: any[]; user: User; onNavigateToHistory?: () => void }) => {
    const theme = useTheme()
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<string[][]>([])
    const [file, setFile] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [activeStep, setActiveStep] = useState(0)
    const [isCloning, setIsCloning] = useState(false)
    const searchParams = useSearchParams()
    const cloneFrom = searchParams.get('cloneFrom')

    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors },
        reset,
        watch
    } = useForm<IFormInput>({
        defaultValues: {
            name: '',
            processorId: '',
            rowsRequested: rows?.length || 0,
            context: '',
            sourceColumns: [],
            includeOriginalColumns: true
        }
    })

    // Watch form values to enable/disable next button
    const watchedValues = watch()

    // drag & drop and file input
    const onDrop = useCallback(
        (acceptedFiles: any) => {
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
                    // Set the rowsRequested value to the number of rows in the CSV
                    setValue('rowsRequested', rows.length)
                    reader.readAsDataURL(file)
                }
            }
            reader.readAsText(file)
        },
        [setValue]
    )

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
        [isFocused, isDragAccept, isDragReject, theme]
    )

    const handleClearFile = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        reset()
        setFileName(null)
        setHeaders([])
        setRows([])
        setFile(null)
        setActiveStep(0)
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

            if (isCloning) {
                await cloneCsvParseRun({
                    csvParseRunId: cloneFrom as string,
                    userId: user.id,
                    orgId: user.org_id,
                    name: data.name,
                    configuration: {
                        context: data.context,
                        sourceColumns: Object.fromEntries(indexToCol.entries()),
                        headers,
                        rowsCount: rows.length
                    },
                    chatflowChatId: data.processorId,
                    rowsRequested: Number(data.rowsRequested),
                    file: file,
                    includeOriginalColumns: data.includeOriginalColumns
                })
            } else {
                await createCsvParseRun({
                    userId: user.id,
                    orgId: user.org_id,
                    name: data.name,
                    configuration: {
                        context: data.context,
                        sourceColumns: Object.fromEntries(indexToCol.entries()),
                        headers,
                        rowsCount: rows.length
                    },
                    chatflowChatId: data.processorId,
                    rowsRequested: Number(data.rowsRequested),
                    file: file,
                    includeOriginalColumns: data.includeOriginalColumns
                })
            }

            setSnackbarMessage('Your CSV is being processed.')
            setSnackbarOpen(true)

            // Reset form and state
            reset()
            setFileName(null)
            setHeaders([])
            setRows([])
            setFile(null)
            setActiveStep(0)

            // Navigate to history tab if the navigation function is provided
            if (onNavigateToHistory) {
                // Add a small delay to allow the snackbar to be seen
                setTimeout(() => {
                    onNavigateToHistory()
                }, 1500)
            }
        } catch (err) {
            // console.log(err)
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

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1)
    }

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1)
    }

    const isStepValid = (step: number) => {
        switch (step) {
            case 0: // Upload step
                return !!fileName
            case 1: // Configuration step
                return (
                    !!watchedValues.name &&
                    !!watchedValues.processorId &&
                    (watchedValues.rowsRequested > 0 || (watchedValues.rowsRequested === rows?.length && rows?.length > 0))
                )
            case 2: // Column selection step
                return true // Always valid as it's optional which columns to select
            case 3: // Context step
                return true // Context is optional
            default:
                return false
        }
    }

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Stack spacing={3}>
                        <Typography variant='h4' gutterBottom>
                            Step 1: Upload CSV File
                        </Typography>
                        <Typography variant='body1' gutterBottom>
                            Upload the CSV file you want to process with AI
                        </Typography>
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
                    </Stack>
                )
            case 1:
                return (
                    <Stack spacing={3}>
                        <Typography variant='h4' gutterBottom>
                            Step 2: Configure Processing
                        </Typography>
                        <Typography variant='body1' gutterBottom>
                            Set up the basic configuration for your CSV processing
                        </Typography>
                        <Card variant='outlined' sx={{ p: 2 }}>
                            <Stack sx={{ gap: 3 }}>
                                <FormControl required error={!!errors.name}>
                                    <Controller
                                        name='name'
                                        control={control}
                                        defaultValue=''
                                        rules={{ required: 'Instance name is required' }}
                                        render={({ field }) => (
                                            <>
                                                <TextField
                                                    {...field}
                                                    required
                                                    label='Instance name'
                                                    variant='outlined'
                                                    error={!!errors.name}
                                                    fullWidth
                                                />
                                                <FormHelperText>
                                                    {errors.name?.message || 'Name to identify this processing run'}
                                                </FormHelperText>
                                            </>
                                        )}
                                    />
                                </FormControl>

                                <FormControl required error={!!errors.processorId}>
                                    <Controller
                                        name='processorId'
                                        control={control}
                                        defaultValue=''
                                        rules={{ required: 'AI Processor selection is required' }}
                                        render={({ field }) => (
                                            <>
                                                <InputLabel required id='processor-select-label'>
                                                    AI Processor
                                                </InputLabel>
                                                <Select
                                                    {...field}
                                                    labelId='processor-select-label'
                                                    label='AI Processor'
                                                    required
                                                    error={!!errors.processorId}
                                                    fullWidth
                                                >
                                                    {chatflows.map((chatflow) => (
                                                        <MenuItem key={chatflow.id} value={chatflow.id}>
                                                            {chatflow.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>
                                                    {errors.processorId?.message || 'Select the AI model to process your CSV'}
                                                </FormHelperText>
                                            </>
                                        )}
                                    />
                                </FormControl>

                                <FormControl required error={!!errors.rowsRequested}>
                                    <Controller
                                        name='rowsRequested'
                                        control={control}
                                        defaultValue={rows?.length ?? 0}
                                        rules={{
                                            required: 'Number of rows is required',
                                            min: { value: 1, message: 'Must process at least 1 row' },
                                            max: { value: rows?.length ?? 0, message: `Maximum ${rows?.length} rows` }
                                        }}
                                        render={({ field: { value, ...field } }) => (
                                            <>
                                                <TextField
                                                    {...field}
                                                    value={value || rows?.length || 0}
                                                    required
                                                    label='Number of rows'
                                                    type='number'
                                                    inputProps={{ min: 1, max: rows?.length ?? 0 }}
                                                    variant='outlined'
                                                    error={!!errors.rowsRequested}
                                                    fullWidth
                                                />
                                                <FormHelperText>
                                                    {errors.rowsRequested?.message || `How many rows to process (max: ${rows?.length})`}
                                                </FormHelperText>
                                            </>
                                        )}
                                    />
                                </FormControl>
                            </Stack>
                        </Card>
                    </Stack>
                )
            case 2:
                return (
                    <Stack spacing={3}>
                        <Typography variant='h4' gutterBottom>
                            Step 3: Select Input Columns
                        </Typography>
                        <Typography variant='body1' gutterBottom>
                            Choose which columns from your CSV should be processed by the AI
                        </Typography>
                        <Card variant='outlined' sx={{ p: 2 }}>
                            <Stack sx={{ gap: 2 }}>
                                <Controller
                                    name='includeOriginalColumns'
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Switch {...field} defaultChecked={true} color='secondary' />}
                                            label='Include all original columns in output?'
                                        />
                                    )}
                                />
                                <Typography variant='subtitle1' gutterBottom>
                                    Select columns to be processed by AI:
                                </Typography>
                                <Controller
                                    name='sourceColumns'
                                    control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <FormControl sx={{ flex: 1 }} component='fieldset' variant='standard'>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 1,
                                                    mt: 1
                                                }}
                                            >
                                                {headers.map((header) => {
                                                    const isSelected = value.includes(header)
                                                    return (
                                                        <Chip
                                                            key={header}
                                                            label={header}
                                                            size='small'
                                                            onClick={() => {
                                                                if (!isSelected) {
                                                                    onChange([...value, header])
                                                                } else {
                                                                    onChange(value.filter((col: string) => col !== header))
                                                                }
                                                            }}
                                                            color={isSelected ? 'primary' : 'default'}
                                                            variant={isSelected ? 'filled' : 'outlined'}
                                                            sx={{
                                                                '&:hover': {
                                                                    backgroundColor: isSelected ? 'primary.main' : 'action.hover'
                                                                }
                                                            }}
                                                        />
                                                    )
                                                })}
                                            </Box>
                                        </FormControl>
                                    )}
                                />
                            </Stack>
                        </Card>
                    </Stack>
                )
            case 3:
                return (
                    <Stack spacing={3}>
                        <Typography variant='h4' gutterBottom>
                            Step 4: Add Context & Process
                        </Typography>
                        <Typography variant='body1' gutterBottom>
                            Provide any additional instructions for the AI and start processing
                        </Typography>
                        <Card variant='outlined' sx={{ p: 2 }}>
                            <Stack sx={{ gap: 2 }}>
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
                )
            default:
                return null
        }
    }

    // Get the selected processor name for display in the overview
    const getSelectedProcessorName = () => {
        const selectedProcessor = chatflows.find((cf) => cf.id === watchedValues.processorId)
        return selectedProcessor ? selectedProcessor.name : ''
    }

    // Function to handle clicking on a step in the overview to navigate back
    const handleStepClick = (step: number) => {
        if (step <= activeStep) {
            setActiveStep(step)
        }
    }

    // Overview panel component
    const renderOverview = () => {
        return (
            <Card variant='outlined' sx={{ p: 2, height: '100%' }}>
                <Stack spacing={2}>
                    <Typography variant='h5' gutterBottom>
                        Overview
                    </Typography>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                        <Typography
                            variant='subtitle1'
                            color={fileName ? 'primary' : 'textSecondary'}
                            sx={{
                                fontWeight: 'bold',
                                cursor: fileName ? 'pointer' : 'default',
                                '&:hover': fileName ? { textDecoration: 'underline' } : {}
                            }}
                            onClick={() => fileName && handleStepClick(0)}
                        >
                            Step 1: Upload CSV
                        </Typography>
                        {fileName && (
                            <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 1 }}>
                                <FilePresentOutlined fontSize='small' />
                                <Typography variant='body2' noWrap sx={{ maxWidth: '200px' }}>
                                    {fileName}
                                </Typography>
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                        <Typography
                            variant='subtitle1'
                            color={fileName ? 'primary' : 'textSecondary'}
                            sx={{
                                fontWeight: 'bold',
                                cursor: fileName ? 'pointer' : 'default',
                                '&:hover': fileName ? { textDecoration: 'underline' } : {}
                            }}
                            onClick={() => fileName && handleStepClick(1)}
                        >
                            Step 2: Configure
                        </Typography>
                        {fileName && (
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                {watchedValues.name && (
                                    <Typography variant='body2'>
                                        <strong>Name:</strong> {watchedValues.name}
                                    </Typography>
                                )}
                                {watchedValues.processorId && (
                                    <Typography variant='body2'>
                                        <strong>Processor:</strong> {getSelectedProcessorName()}
                                    </Typography>
                                )}
                                {watchedValues.rowsRequested > 0 && (
                                    <Typography variant='body2'>
                                        <strong>Rows:</strong> {watchedValues.rowsRequested} of {rows.length}
                                    </Typography>
                                )}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                        <Typography
                            variant='subtitle1'
                            color={fileName ? 'primary' : 'textSecondary'}
                            sx={{
                                fontWeight: 'bold',
                                cursor: fileName && activeStep >= 1 ? 'pointer' : 'default',
                                '&:hover': fileName && activeStep >= 1 ? { textDecoration: 'underline' } : {}
                            }}
                            onClick={() => fileName && activeStep >= 1 && handleStepClick(2)}
                        >
                            Step 3: Select Columns
                        </Typography>
                        {fileName && activeStep >= 1 && (
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                <Typography variant='body2'>
                                    <strong>Include original columns:</strong> {watchedValues.includeOriginalColumns ? 'Yes' : 'No'}
                                </Typography>
                                {watchedValues.sourceColumns.length > 0 ? (
                                    <>
                                        <Typography variant='body2'>
                                            <strong>Selected columns:</strong> {watchedValues.sourceColumns.length}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {watchedValues.sourceColumns.slice(0, 3).map((col) => (
                                                <Chip key={col} label={col} size='small' />
                                            ))}
                                            {watchedValues.sourceColumns.length > 3 && (
                                                <Chip
                                                    label={`+${watchedValues.sourceColumns.length - 3} more`}
                                                    size='small'
                                                    variant='outlined'
                                                />
                                            )}
                                        </Box>
                                    </>
                                ) : (
                                    <Typography variant='body2' color='text.secondary'>
                                        No columns selected
                                    </Typography>
                                )}
                            </Stack>
                        )}
                    </Box>

                    <Box>
                        <Typography
                            variant='subtitle1'
                            color={fileName ? 'primary' : 'textSecondary'}
                            sx={{
                                fontWeight: 'bold',
                                cursor: fileName && activeStep >= 2 ? 'pointer' : 'default',
                                '&:hover': fileName && activeStep >= 2 ? { textDecoration: 'underline' } : {}
                            }}
                            onClick={() => fileName && activeStep >= 2 && handleStepClick(3)}
                        >
                            Step 4: Add Context
                        </Typography>
                        {fileName && activeStep >= 2 && watchedValues.context && (
                            <Typography variant='body2' sx={{ mt: 1 }}>
                                {watchedValues.context.length > 100
                                    ? `${watchedValues.context.substring(0, 100)}...`
                                    : watchedValues.context}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </Card>
        )
    }

    const handleCancel = () => {
        setIsCloning(false)
        reset()
        setFile(null)
        setLoading(false)
        setFileName(null)
        setHeaders([])
        setRows([])
        setActiveStep(0)
    }

    useEffect(() => {
        const getData = async () => {
            setLoading(true)
            const csvParseRun = await fetchCsvParseRun({ csvParseRunId: cloneFrom as string })
            if (csvParseRun) {
                const chatflowChatId = csvParseRun.chatflowChatId
                const headers = csvParseRun.configuration.headers
                const sourceColumns = csvParseRun.configuration.sourceColumns
                const context = csvParseRun.configuration.context
                const rowsCount = csvParseRun.configuration.rowsCount
                const includeOriginalColumns = csvParseRun.includeOriginalColumns
                const name = csvParseRun.name
                const rowsRequested = csvParseRun.rowsRequested
                setHeaders(headers)
                setRows(Array.from({ length: rowsCount }, (_, i) => [`row${i + 1}`]))
                setActiveStep(0)
                setFileName(name)
                setIsCloning(true)
                reset({
                    processorId: chatflowChatId,
                    name,
                    rowsRequested,
                    context,
                    sourceColumns: Object.values(sourceColumns),
                    includeOriginalColumns
                })
            }
            setLoading(false)
        }
        if (cloneFrom) {
            getData()
        }
    }, [cloneFrom])

    return (
        <Stack flexDirection='column' sx={{ gap: 4 }} component='form' onSubmit={handleSubmit(handleProcessCsv)}>
            {loading && (
                <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open>
                    <CircularProgress color='inherit' />
                </Backdrop>
            )}

            {/* Stepper Header */}
            <Box sx={{ width: '100%' }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    <Step key='upload'>
                        <StepLabel
                            StepIconProps={{
                                sx: {
                                    '& .MuiStepIcon-text': { fill: activeStep >= 0 ? 'white' : 'currentColor' },
                                    '&.MuiStepIcon-root': {
                                        color: activeStep >= 0 ? theme.palette.primary.main : 'transparent',
                                        border: activeStep >= 0 ? 'none' : `1px solid ${theme.palette.primary.main}`,
                                        borderRadius: '50%'
                                    }
                                }
                            }}
                        >
                            Upload CSV
                        </StepLabel>
                    </Step>
                    <Step key='configure'>
                        <StepLabel
                            StepIconProps={{
                                sx: {
                                    '& .MuiStepIcon-text': { fill: activeStep >= 1 ? 'white' : 'currentColor' },
                                    '&.MuiStepIcon-root': {
                                        color: activeStep >= 1 ? theme.palette.primary.main : 'transparent',
                                        border: activeStep >= 1 ? 'none' : `1px solid ${theme.palette.primary.main}`,
                                        borderRadius: '50%'
                                    }
                                }
                            }}
                        >
                            Configure
                        </StepLabel>
                    </Step>
                    <Step key='columns'>
                        <StepLabel
                            StepIconProps={{
                                sx: {
                                    '& .MuiStepIcon-text': { fill: activeStep >= 2 ? 'white' : 'currentColor' },
                                    '&.MuiStepIcon-root': {
                                        color: activeStep >= 2 ? theme.palette.primary.main : 'transparent',
                                        border: activeStep >= 2 ? 'none' : `1px solid ${theme.palette.primary.main}`,
                                        borderRadius: '50%'
                                    }
                                }
                            }}
                        >
                            Select Columns
                        </StepLabel>
                    </Step>
                    <Step key='process'>
                        <StepLabel
                            StepIconProps={{
                                sx: {
                                    '& .MuiStepIcon-text': { fill: activeStep >= 3 ? 'white' : 'currentColor' },
                                    '&.MuiStepIcon-root': {
                                        color: activeStep >= 3 ? theme.palette.primary.main : 'transparent',
                                        border: activeStep >= 3 ? 'none' : `1px solid ${theme.palette.primary.main}`,
                                        borderRadius: '50%'
                                    }
                                }
                            }}
                        >
                            Add Context & Process
                        </StepLabel>
                    </Step>
                </Stepper>
            </Box>

            {/* Main content with step content and overview */}
            <Box sx={{ display: 'flex', gap: 3 }}>
                {/* Step Content */}
                <Box sx={{ flex: '1 1 70%', mt: 2, mb: 2 }}>{renderStepContent()}</Box>

                {/* Overview Panel */}
                <Box sx={{ flex: '0 0 30%', mt: 2, mb: 2, display: { xs: 'none', md: 'block' } }}>{renderOverview()}</Box>
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button variant='outlined' color='primary' disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                </Button>
                <Button variant='outlined' color='error' onClick={handleCancel}>
                    Cancel
                </Button>
                <Box sx={{ flex: '1 1 auto' }} />
                {activeStep === 3 ? (
                    <Button
                        variant='contained'
                        startIcon={<DownloadOutlined sx={{ background: 'transparent' }} />}
                        onClick={handleSubmit(handleProcessCsv)}
                        type='button'
                    >
                        Process and Download AI-Enhanced CSV
                    </Button>
                ) : (
                    <Button variant='contained' onClick={handleNext} disabled={!isStepValid(activeStep)}>
                        Next
                    </Button>
                )}
            </Box>

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
