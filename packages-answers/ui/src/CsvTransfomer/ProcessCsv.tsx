import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Controller, useForm } from 'react-hook-form'
import { InputLabel, Select, MenuItem } from '@mui/material'

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
    Backdrop,
    CircularProgress,
    FormHelperText,
    Stepper,
    Step,
    StepLabel,
    Alert,
    AlertTitle
} from '@mui/material'
import { User } from 'types'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import FilePresentOutlined from '@mui/icons-material/FilePresentOutlined'

import CsvNoticeCard from './CsvNoticeCard'
import SnackMessage from '../SnackMessage'
import { parseCsvWithHeaders, parseCsvWithoutHeaders } from './parseCsv'

interface ChatFlow {
    id: string
    name: string
    [key: string]: any
}

interface CsvConfiguration {
    context: string
    sourceColumns: Record<string, string>
    headers: string[]
    rowsCount: number
    firstRowIsHeaders: boolean
}
async function createCsvParseRun({
    name,
    configuration,
    chatflowChatId,
    rowsRequested,
    file,
    includeOriginalColumns,
    csvParseRunId
}: {
    name: string
    configuration: CsvConfiguration
    chatflowChatId: string
    rowsRequested: number
    file?: string | null
    includeOriginalColumns: boolean
    csvParseRunId?: string
}) {
    if (!file && !csvParseRunId) throw new Error('No file or csvParseRunId provided')

    const token = sessionStorage.getItem('access_token')
    const baseURL = sessionStorage.getItem('baseURL') || ''
    const response = await fetch(`${baseURL}/api/v1/csv-parser`, {
        method: 'POST',
        body: JSON.stringify({
            name,
            configuration,
            chatflowChatId,
            rowsRequested,
            file,
            includeOriginalColumns,
            csvParseRunId
        }),
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    const csvParseRun = await response.json()
    if (!response.ok) {
        throw new Error(csvParseRun?.message || 'Failed to create csv parse run')
    }
    return csvParseRun?.raw
}

async function fetchCsvParseRun({ csvParseRunId }: { csvParseRunId: string }) {
    const baseURL = sessionStorage.getItem('baseURL') || ''
    const token = sessionStorage.getItem('access_token')
    const response = await fetch(`${baseURL}/api/v1/csv-parser/${csvParseRunId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    if (!response.ok) {
        throw new Error('Failed to get csv parse run')
    }
    const csvParseRun = await response.json()
    return csvParseRun
}

const baseStyle: React.CSSProperties = {
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
    firstRowIsHeaders: boolean
}

const ProcessCsv = ({
    chatflows,
    user,
    onNavigateToHistory,
    onRefreshChatflows
}: {
    chatflows: ChatFlow[]
    user: User
    onNavigateToHistory?: () => void
    onRefreshChatflows?: () => Promise<void>
}) => {
    const theme = useTheme()
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<string[][]>([])
    const [file, setFile] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [csvErrors, setCsvErrors] = useState<string[]>([])
    const [toastMessage, setToastMessage] = useState('')
    const [activeStep, setActiveStep] = useState(0)
    const [isCloning, setIsCloning] = useState(false)
    const [csvContent, setCsvContent] = useState<string>('')
    const searchParams = useSearchParams()
    const cloneFrom = searchParams.get('cloneFrom')
    const hasAutoSelected = useRef(false)
    const fileReadersRef = useRef<{ mainReader?: FileReader; dataUrlReader?: FileReader }>({})

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
            sourceColumns: headers,
            includeOriginalColumns: true,
            firstRowIsHeaders: true
        }
    })

    const watchedValues = watch()

    // Utility function to format file sizes for better UX
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 1))
        return `${size} ${sizes[i]}`
    }, [])

    // Enhanced file size validation with progressive feedback
    const validateFileSize = useCallback(
        (fileSize: number, fileName: string) => {
            const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
            const WARNING_SIZE = 25 * 1024 * 1024 // 25MB (50% of limit)

            if (fileSize > MAX_FILE_SIZE) {
                setToastMessage(
                    `File "${fileName}" is too large (${formatFileSize(fileSize)}). ` +
                        `Maximum allowed: ${formatFileSize(MAX_FILE_SIZE)}. ` +
                        `Consider splitting large files or processing a sample of your data.`
                )
                return { valid: false, isWarning: false }
            }

            if (fileSize > WARNING_SIZE) {
                setToastMessage(
                    `Large file detected (${formatFileSize(fileSize)}). ` +
                        `Processing may take longer than usual. Files larger than ${formatFileSize(MAX_FILE_SIZE)} are not supported.`
                )
                return { valid: true, isWarning: true }
            }

            return { valid: true, isWarning: false }
        },
        [formatFileSize]
    )

    // FileReader cleanup function
    const cleanupFileReaders = useCallback(() => {
        const readers = fileReadersRef.current
        if (readers.mainReader) {
            readers.mainReader.onload = null
            readers.mainReader.onerror = null
            readers.mainReader.abort()
            readers.mainReader = undefined
        }
        if (readers.dataUrlReader) {
            readers.dataUrlReader.onload = null
            readers.dataUrlReader.onerror = null
            readers.dataUrlReader.abort()
            readers.dataUrlReader = undefined
        }
    }, [])

    // Cleanup FileReaders on component unmount
    useEffect(() => {
        return cleanupFileReaders
    }, [cleanupFileReaders])

    // Auto-select first processor when chatflows appear (only once)
    useEffect(() => {
        if (!watchedValues.processorId && chatflows.length > 0 && !hasAutoSelected.current) {
            setValue('processorId', chatflows[0].id, { shouldValidate: true })
            setToastMessage(`Selected processor: ${chatflows[0].name}`)
            hasAutoSelected.current = true
        }
    }, [chatflows, watchedValues.processorId, setValue])

    // Function to convert technical errors to user-friendly messages
    const getDetailedCsvError = (error: string): string => {
        if (error.includes('Number of columns')) {
            return 'CSV structure error: The number of columns in your header row does not match the number of columns in your data rows. This usually happens when fields contain commas that are not properly enclosed in quotes. The system will automatically fix this for you.'
        }

        if (error.includes('no header row')) {
            return 'CSV format error: Your CSV appears to have no header row. The system will automatically create a default structure for single-column CSVs.'
        }

        if (error.includes('no data rows')) {
            return 'CSV content error: Your CSV file appears to have no data rows after the header, or the header could not be determined.'
        }

        if (error.includes('Unmatched quotes')) {
            return 'CSV format error: Your CSV contains unclosed quotes. Make sure all quoted fields start and end with double quotes ("").'
        }

        if (error.includes('Fields containing commas must be enclosed')) {
            return 'CSV format error: Fields containing commas must be enclosed in quotes for proper parsing. The system will automatically fix this for you.'
        }

        if (error.includes('Row') && error.includes('columns but expected')) {
            return 'CSV structure error: Some rows have a different number of columns than expected. This usually happens when fields contain commas that are not properly enclosed in quotes. The system will automatically fix this for you.'
        }

        return error
    }

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0]

            // Enhanced file size validation with progressive feedback
            const sizeValidation = validateFileSize(file.size, file.name)
            if (!sizeValidation.valid) {
                return
            }
            setFileName(file.name)
            setCsvErrors([]) // Clear any previous CSV errors

            // Cleanup any existing readers before starting new ones
            cleanupFileReaders()

            const reader = new FileReader()
            fileReadersRef.current.mainReader = reader

            // Add error handler for main reader
            reader.onerror = () => {
                setToastMessage('Failed to read CSV file. Please ensure the file is not corrupted.')
                setCsvErrors(['File reading failed: Unable to read file content'])
                setFileName(null)
                // Cleanup reader reference
                if (fileReadersRef.current.mainReader === reader) {
                    fileReadersRef.current.mainReader = undefined
                }
            }

            reader.onload = (event) => {
                const result = event.target?.result
                if (typeof result !== 'string') {
                    setToastMessage('Failed to read CSV file. Please ensure the file is a valid CSV format.')
                    setCsvErrors(['File reading failed: Unable to process file content'])
                    return
                }

                try {
                    // Store CSV content for re-parsing when user changes header settings
                    setCsvContent(result)

                    // Parse CSV with user-controlled header interpretation
                    const { headers: H, rows: R } = watchedValues.firstRowIsHeaders
                        ? parseCsvWithHeaders(result)
                        : parseCsvWithoutHeaders(result)
                    setCsvErrors([])
                    setHeaders(H)
                    setRows(R)

                    // Set sourceColumns - H is already correct based on user decision
                    setValue('sourceColumns', H, { shouldValidate: true })

                    // Set rowsRequested - R.length is data rows based on user decision
                    setValue('rowsRequested', R.length, { shouldValidate: true })
                    // Convert file to data URL for storage
                    const dataUrlReader = new FileReader()
                    fileReadersRef.current.dataUrlReader = dataUrlReader

                    dataUrlReader.onload = () => {
                        if (dataUrlReader?.result && typeof dataUrlReader.result === 'string') {
                            setFile(dataUrlReader.result)
                        } else {
                            setToastMessage('Failed to process file for upload. Please try again.')
                            setFile(null)
                        }
                        // Cleanup reader reference
                        if (fileReadersRef.current.dataUrlReader === dataUrlReader) {
                            fileReadersRef.current.dataUrlReader = undefined
                        }
                    }
                    dataUrlReader.onerror = () => {
                        setToastMessage('Failed to process file for upload. Please try again.')
                        setFile(null)
                        // Cleanup reader reference
                        if (fileReadersRef.current.dataUrlReader === dataUrlReader) {
                            fileReadersRef.current.dataUrlReader = undefined
                        }
                    }
                    dataUrlReader.readAsDataURL(file)
                } catch (e: unknown) {
                    const errorMessage = getDetailedCsvError(e instanceof Error ? e.message : 'CSV parsing failed.')
                    setCsvErrors([errorMessage])
                    setHeaders([])
                    setRows([])
                    setValue('rowsRequested', 0)
                    setToastMessage('CSV validation failed. Please fix the file format.')
                    setFile(null)
                    // Cleanup any active readers
                    cleanupFileReaders()
                }
            }
            reader.readAsText(file)
        },
        [setValue, watchedValues.firstRowIsHeaders, cleanupFileReaders, validateFileSize]
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
                await createCsvParseRun({
                    csvParseRunId: cloneFrom as string,
                    name: data.name,
                    configuration: {
                        context: data.context,
                        sourceColumns: Object.fromEntries(indexToCol.entries()),
                        headers,
                        rowsCount: rows.length,
                        firstRowIsHeaders: data.firstRowIsHeaders
                    },
                    chatflowChatId: data.processorId,
                    rowsRequested: Number(data.rowsRequested),
                    file: file,
                    includeOriginalColumns: data.includeOriginalColumns
                })
            } else {
                await createCsvParseRun({
                    name: data.name,
                    configuration: {
                        context: data.context,
                        sourceColumns: Object.fromEntries(indexToCol.entries()),
                        headers,
                        rowsCount: rows.length,
                        firstRowIsHeaders: data.firstRowIsHeaders
                    },
                    chatflowChatId: data.processorId,
                    rowsRequested: Number(data.rowsRequested),
                    file: file,
                    includeOriginalColumns: data.includeOriginalColumns
                })
            }

            setToastMessage('Your CSV is being processed.')

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
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
            setToastMessage(`Error processing CSV: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1)
    }

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1)
    }

    const isStepValid = (step: number) => {
        switch (step) {
            case 0:
                return !!fileName && csvErrors.length === 0 && headers.length > 0 && rows.length > 0
            case 1:
                return (
                    !!watchedValues.name &&
                    !!watchedValues.processorId &&
                    chatflows.length > 0 &&
                    watchedValues.rowsRequested > 0 &&
                    watchedValues.rowsRequested <= (rows?.length || 0)
                )
            case 2:
                return true
            case 3:
                return true
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
                            Upload the CSV file you want to process with AI. Ensure the first row contains headers. Lines starting with
                            &apos;#&apos; are treated as comments.
                        </Typography>
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
                                <Typography>{'Drag &apos;n&apos; drop a CSV file here, or click to select a file'}</Typography>
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
                                                    disabled={chatflows.length === 0}
                                                    fullWidth
                                                >
                                                    {chatflows.length === 0 ? (
                                                        <MenuItem disabled value=''>
                                                            No CSV processors available
                                                        </MenuItem>
                                                    ) : (
                                                        chatflows.map((chatflow) => (
                                                            <MenuItem key={chatflow.id} value={chatflow.id}>
                                                                {chatflow.name}
                                                            </MenuItem>
                                                        ))
                                                    )}
                                                </Select>
                                                <FormHelperText>
                                                    {errors.processorId?.message ||
                                                        (chatflows.length === 0
                                                            ? 'Install a CSV processor from the marketplace below to continue'
                                                            : 'Select the AI model to process your CSV')}
                                                </FormHelperText>
                                            </>
                                        )}
                                    />
                                </FormControl>

                                {/* Show CSV notice card when no CSV chatflows are available */}
                                {chatflows.length === 0 && <CsvNoticeCard onRefresh={onRefreshChatflows} />}

                                {/* CSV Header Detection Toggle */}
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <Controller
                                        name='firstRowIsHeaders'
                                        control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={value}
                                                        onChange={(e) => {
                                                            const newHeaderSetting = e.target.checked
                                                            onChange(newHeaderSetting)

                                                            // Re-parse CSV with new header interpretation
                                                            if (csvContent) {
                                                                try {
                                                                    const { headers: newH, rows: newR } = newHeaderSetting
                                                                        ? parseCsvWithHeaders(csvContent)
                                                                        : parseCsvWithoutHeaders(csvContent)
                                                                    setHeaders(newH)
                                                                    setRows(newR)
                                                                    setValue('sourceColumns', newH, { shouldValidate: true })

                                                                    // Set rowsRequested to new maximum available when toggle changes
                                                                    setValue('rowsRequested', newR.length)
                                                                } catch (error) {
                                                                    console.error('CSV re-parsing error:', error)
                                                                    setCsvErrors(['Error re-parsing CSV with new header setting'])
                                                                }
                                                            }
                                                        }}
                                                        color='primary'
                                                    />
                                                }
                                                label='First row contains column headers'
                                                sx={{
                                                    '& .MuiFormControlLabel-label': {
                                                        fontSize: '0.875rem',
                                                        color: 'text.secondary'
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                    <FormHelperText>
                                        {watchedValues.firstRowIsHeaders
                                            ? 'First row will be used as column names, remaining rows will be processed as data'
                                            : 'All rows will be treated as data, generic column names (Column 1, Column 2, etc.) will be used'}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl required error={!!errors.rowsRequested || watchedValues.rowsRequested > (rows?.length || 0)}>
                                    <Controller
                                        name='rowsRequested'
                                        control={control}
                                        defaultValue={rows?.length ?? 0}
                                        rules={{
                                            required: 'Number of rows is required',
                                            min: { value: 1, message: 'Must process at least 1 row' },
                                            max: {
                                                value: rows?.length ?? 0,
                                                message: `Maximum ${rows?.length ?? 0} rows`
                                            }
                                        }}
                                        render={({ field: { value, ...field } }) => (
                                            <>
                                                <TextField
                                                    {...field}
                                                    value={value || rows?.length || 0}
                                                    required
                                                    label='Number of rows'
                                                    type='number'
                                                    inputProps={{
                                                        min: 1,
                                                        max: rows?.length ?? 0
                                                    }}
                                                    variant='outlined'
                                                    error={!!errors.rowsRequested || watchedValues.rowsRequested > (rows?.length || 0)}
                                                    fullWidth
                                                />
                                                <FormHelperText>
                                                    {errors.rowsRequested?.message ||
                                                        (watchedValues.rowsRequested > (rows?.length || 0)
                                                            ? `Cannot process more rows than available (max: ${rows?.length || 0})`
                                                            : `How many rows to process (max: ${rows?.length || 0})`)}
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
                                            value={typeof field.value === 'string' ? field.value : ''}
                                            label='Additional context'
                                            placeholder='Add custom prompt, analysis instructions, or specific AI behavior...'
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

    const getSelectedProcessorName = () => {
        const selectedProcessor = chatflows.find((cf) => cf.id === watchedValues.processorId)
        return selectedProcessor ? selectedProcessor.name : ''
    }

    const handleStepClick = (step: number) => {
        if (step <= activeStep) {
            setActiveStep(step)
        }
    }

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
                                    <Typography variant='body2' color={watchedValues.rowsRequested > rows.length ? 'error' : 'inherit'}>
                                        <strong>Rows:</strong> {watchedValues.rowsRequested} of {rows.length}
                                        {watchedValues.rowsRequested > rows.length && (
                                            <span style={{ color: '#F44336', fontWeight: 'light' }}> Exceeds limit</span>
                                        )}
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
                                                <Chip
                                                    key={col}
                                                    label={col.length > 20 ? `${col.substring(0, 20)}...` : col}
                                                    title={col} // Full text on hover
                                                    size='small'
                                                    sx={{ maxWidth: '150px' }}
                                                />
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
        setCsvErrors([])
        setToastMessage('')
        setCsvContent('')
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
                    context: typeof context === 'string' ? context : '',
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

            {/* CSV validation errors */}
            {csvErrors.length > 0 && (
                <Alert
                    severity='error'
                    sx={{
                        mb: 3,
                        border: '2px solid',
                        borderColor: 'error.main',
                        '& .MuiAlert-message': { width: '100%' }
                    }}
                >
                    <AlertTitle sx={{ fontSize: '1.1rem', fontWeight: 'bold', mb: 1 }}>⚠️ CSV File Error - Cannot Continue</AlertTitle>

                    <Typography variant='body2' sx={{ mb: 2, fontWeight: 500 }}>
                        Your CSV file has the following issues that must be fixed:
                    </Typography>

                    <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 2 }}>
                        {csvErrors.map((error, i) => (
                            <li key={`csv-error-${i}-${error.substring(0, 20)}`}>
                                <Typography variant='body2' sx={{ mb: 1 }}>
                                    {error}
                                </Typography>
                            </li>
                        ))}
                    </ul>

                    <Typography
                        variant='body2'
                        sx={{
                            mt: 2,
                            fontWeight: 'bold',
                            color: 'error.dark',
                            p: 1,
                            bgcolor: 'error.light',
                            borderRadius: 1
                        }}
                    >
                        Please fix these issues and upload a valid CSV file to continue.
                    </Typography>
                </Alert>
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

            <SnackMessage message={toastMessage} />
        </Stack>
    )
}

export default ProcessCsv
