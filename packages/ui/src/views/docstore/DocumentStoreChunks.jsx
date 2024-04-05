import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Divider, Grid, OutlinedInput, Stack, Typography } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import documentsApi from '@/api/documents'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import Card from '@mui/material/Card'

import CardContent from '@mui/material/CardContent'
import { useNavigate } from 'react-router-dom'
import { IconArrowBack } from '@tabler/icons'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { InputSlider } from '@/ui-component/slider/InputSlider'
import { SwitchInput } from '@/ui-component/switch/Switch'

// ==============================|| DOCUMENTS ||============================== //
const ContentTypes = [
    {
        label: 'Text',
        name: 'text'
    },
    {
        label: 'Code',
        name: 'code'
    },
    {
        label: 'Markdown',
        name: 'markdown'
    }
]
const PdfUsage = [
    {
        label: 'One document per page',
        name: 'perPage'
    },
    {
        label: 'One document per file',
        name: 'perFile'
    }
]

const TextSplitter = [
    {
        label: 'Character Text Splitter',
        name: 'character-splitter'
    },
    {
        label: 'Recursive Text Splitter',
        name: 'recursive-splitter'
    }
]
const MarkdownSplitter = [
    {
        label: 'Markdown Text Splitter',
        name: 'markdown-splitter'
    }
]

const Languages = [
    {
        label: 'cpp',
        name: 'cpp'
    },
    {
        label: 'go',
        name: 'go'
    },
    {
        label: 'java',
        name: 'java'
    },
    {
        label: 'js',
        name: 'js'
    },
    {
        label: 'php',
        name: 'php'
    },
    {
        label: 'proto',
        name: 'proto'
    },
    {
        label: 'python',
        name: 'python'
    },
    {
        label: 'rst',
        name: 'rst'
    },
    {
        label: 'ruby',
        name: 'ruby'
    },
    {
        label: 'rust',
        name: 'rust'
    },
    {
        label: 'scala',
        name: 'scala'
    },
    {
        label: 'swift',
        name: 'swift'
    },
    {
        label: 'markdown',
        name: 'markdown'
    },
    {
        label: 'latex',
        name: 'latex'
    },
    {
        label: 'html',
        name: 'html'
    },
    {
        label: 'sol',
        name: 'sol'
    }
]

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    maxHeight: '250px',
    minHeight: '250px',
    maxWidth: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
    padding: 1
}))

const DocumentStoreChunks = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getChunksApi = useApi(documentsApi.getFileChunks)
    const previewApi = useApi(documentsApi.previewChunks)
    const processApi = useApi(documentsApi.processChunks)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'documentStores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'documentStores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)
    const [currentPreviewCount, setCurrentPreviewCount] = useState(0)
    const [previewChunkCount, setPreviewChunkCount] = useState(20)
    const [contentType, setContentType] = useState('text')
    const [textSplitter, setTextSplitter] = useState('recursive-splitter')
    const [codeLanguage, setCodeLanguage] = useState('')
    const [customSeparator, setCustomSeparator] = useState('\\n')
    const [chunkSize, setChunkSize] = useState(1500)
    const [chunkOverlap, setChunkOverlap] = useState(50)
    const [pdfUsage, setPdfUsage] = useState('perPage')
    const [pdfLegacyBuild, setPdfLegacyBuild] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getChunksApi.request(storeId, fileId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getChunksApi.data) {
            const data = getChunksApi.data
            setTotalChunks(data.count)
            setDocumentChunks(data.chunks)
            setCurrentPreviewCount(data.count)
            setPreviewChunkCount(20)
            if (data.file.config) {
                const fileConfig = JSON.parse(data.file.config)
                setTextSplitter(fileConfig.splitter)
                setChunkSize(fileConfig.chunkSize)
                setChunkOverlap(fileConfig.chunkOverlap)
                setCustomSeparator(fileConfig.separator)
                setPreviewChunkCount(fileConfig.previewChunkCount)
                if (data?.file?.name?.toLowerCase().endsWith('pdf')) {
                    setPdfUsage(fileConfig.pdfUsage)
                    setPdfLegacyBuild(fileConfig.pdfLegacyBuild)
                }
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChunksApi.data])

    const openDS = (storeId) => {
        navigate('/documentStores/' + storeId)
    }

    const showPreview = () => {
        setLoading(true)
        setDocumentChunks([])
        const config = {
            splitter: textSplitter,
            chunkSize: chunkSize,
            chunkOverlap: chunkOverlap,
            separator: customSeparator,
            previewChunkCount: previewChunkCount
        }
        if (getChunksApi.data?.file?.name?.toLowerCase().endsWith('pdf')) {
            config.pdfUsage = pdfUsage
            config.pdfLegacyBuild = pdfLegacyBuild
        }
        previewApi.request(storeId, fileId, config)
    }

    const processChunks = () => {
        setLoading(true)
        setDocumentChunks([])
        const config = {
            splitter: textSplitter,
            chunkSize: chunkSize,
            chunkOverlap: chunkOverlap,
            separator: customSeparator,
            previewChunkCount: -1
        }
        if (getChunksApi.data?.file?.name?.toLowerCase().endsWith('pdf')) {
            config.pdfUsage = pdfUsage
            config.pdfLegacyBuild = pdfLegacyBuild
        }
        processApi.request(storeId, fileId, config)
    }

    useEffect(() => {
        if (previewApi.data) {
            setTotalChunks(previewApi.data.totalChunks)
            setDocumentChunks(previewApi.data.chunks)
            setCurrentPreviewCount(previewApi.data.previewChunkCount)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewApi.data])

    useEffect(() => {
        if (processApi.data) {
            setTotalChunks(processApi.data.chunks.length)
            setDocumentChunks(processApi.data.chunks)
            setCurrentPreviewCount(processApi.data.chunks.length)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processApi.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid container direction='row'>
                        <div>
                            <h1>{getChunksApi.data?.file?.name}</h1>
                            <h3>Chunking Playground & Settings</h3>
                        </div>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                startIcon={<IconArrowBack />}
                                onClick={() => openDS(storeId)}
                            >
                                Back to Document Store
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                {loading && <BackdropLoader open={loading} />}
                <Box>
                    <Grid container spacing='2'>
                        <Grid item xs={4} md={6} lg={6} sm={4}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    paddingRight: 15
                                }}
                            >
                                <Box sx={{ p: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Content Type<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <Dropdown
                                        key={contentType}
                                        name='variableType'
                                        options={ContentTypes}
                                        onSelect={(newValue) => setContentType(newValue)}
                                        value={contentType ?? 'choose an option'}
                                    />
                                </Box>
                                {contentType === 'text' && (
                                    <Box sx={{ p: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>
                                                Splitter<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <Dropdown
                                            key={textSplitter}
                                            name='textSplitter'
                                            options={TextSplitter}
                                            onSelect={(newValue) => setTextSplitter(newValue)}
                                            value={textSplitter ?? 'choose an option'}
                                        />
                                    </Box>
                                )}
                                {textSplitter === 'markdown' && (
                                    <Box sx={{ p: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>
                                                Splitter<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <Dropdown
                                            key={textSplitter}
                                            name='textSplitter'
                                            options={MarkdownSplitter}
                                            onSelect={(newValue) => setTextSplitter(newValue)}
                                            value={textSplitter ?? 'choose an option'}
                                        />
                                    </Box>
                                )}
                                {textSplitter === 'recursive-splitter' && (
                                    <Box sx={{ p: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>Custom Separators</Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <OutlinedInput
                                            size='small'
                                            multiline={false}
                                            sx={{ mt: 1 }}
                                            type='text'
                                            fullWidth
                                            key='customSeparator'
                                            onChange={(e) => setCustomSeparator(e.target.value)}
                                            value={customSeparator ?? ''}
                                        />
                                    </Box>
                                )}
                                {contentType === 'code' && (
                                    <Box sx={{ p: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>
                                                Language<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <Dropdown
                                            key={textSplitter}
                                            name='textSplitter'
                                            options={Languages}
                                            onSelect={(newValue) => setCodeLanguage(newValue)}
                                            value={codeLanguage ?? 'choose an option'}
                                        />
                                    </Box>
                                )}

                                <Box sx={{ p: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Maximum Chunk Size<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <InputSlider value={chunkSize} onChange={setChunkSize} />
                                </Box>
                                <Box sx={{ p: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Chunk Overlap<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <InputSlider value={chunkOverlap} onChange={setChunkOverlap} />
                                    {chunkOverlap >= chunkSize && (
                                        <Typography variant='text.secondary' style={{ color: 'red' }}>
                                            Overlap should be less than chunk size
                                        </Typography>
                                    )}
                                </Box>
                                {getChunksApi.data?.file?.name?.toLowerCase().endsWith('pdf') && (
                                    <>
                                        <Box>
                                            <Divider textAlign='center'>PDF Settings</Divider>
                                        </Box>
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <Typography>
                                                    Usage<span style={{ color: 'red' }}>&nbsp;*</span>
                                                </Typography>
                                                <div style={{ flexGrow: 1 }}></div>
                                            </div>
                                            <Dropdown
                                                key={pdfUsage}
                                                name='pdfUsage'
                                                options={PdfUsage}
                                                onSelect={(newValue) => setPdfUsage(newValue)}
                                                value={pdfUsage ?? 'choose an option'}
                                            />
                                        </Box>
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <Typography>Use Legacy Build</Typography>
                                                <div style={{ flexGrow: 1 }}></div>
                                            </div>
                                            <SwitchInput label='' value={pdfLegacyBuild} onChange={setPdfLegacyBuild} />
                                        </Box>
                                    </>
                                )}
                                <Box sx={{ p: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Show Chunks in Preview<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        size='small'
                                        multiline={false}
                                        sx={{ mt: 1 }}
                                        type='number'
                                        fullWidth
                                        key='previewChunkCount'
                                        onChange={(e) => setPreviewChunkCount(e.target.value)}
                                        value={previewChunkCount ?? 25}
                                    />
                                </Box>
                                <Box sx={{ p: 1, textAlign: 'center' }}>
                                    <StyledButton variant='contained' sx={{ color: 'white' }} onClick={processChunks}>
                                        Confirm & Process
                                    </StyledButton>{' '}
                                    <StyledButton variant='contained' sx={{ color: 'white' }} onClick={showPreview}>
                                        Preview
                                    </StyledButton>
                                </Box>
                            </div>
                        </Grid>
                        <Grid item xs={8} md={6} lg={6} sm={8}>
                            <Typography style={{ marginBottom: 5, wordWrap: 'break-word', textAlign: 'left' }} variant='h4'>
                                Preview: Showing {currentPreviewCount} of {totalChunks} Chunks.
                            </Typography>
                            <div style={{ height: '800px', overflow: 'scroll' }}>
                                <Grid container spacing={2}>
                                    {documentChunks?.map((row, index) => (
                                        <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                            <CardWrapper>
                                                <Card style={{ padding: 0 }}>
                                                    <CardContent style={{ padding: 0 }}>
                                                        <Typography color='textSecondary' gutterBottom>
                                                            {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                        </Typography>
                                                        <Typography
                                                            sx={{ wordWrap: 'break-word' }}
                                                            variant='body2'
                                                            style={{ fontSize: 10 }}
                                                        >
                                                            {row.pageContent}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </CardWrapper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </div>
                        </Grid>
                    </Grid>
                </Box>
            </MainCard>
        </>
    )
}

export default DocumentStoreChunks
