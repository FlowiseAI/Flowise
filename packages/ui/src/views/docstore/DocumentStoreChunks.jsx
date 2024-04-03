import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Grid, OutlinedInput, Stack, Typography } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

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

    const getChunks = useApi(documentsApi.getFileChunks)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'documentStores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'documentStores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)
    const [contentType, setContentType] = useState('text')
    const [textSplitter, setTextSplitter] = useState('recursive-splitter')
    const [codeLanguage, setCodeLanguage] = useState('')
    const [customSeparator, setCustomSeparator] = useState('')
    const [chunkSize, setChunkSize] = useState(1000)
    const [chunkOverlap, setChunkOverlap] = useState(50)

    useEffect(() => {
        getChunks.request(storeId, fileId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getChunks.data) {
            setTotalChunks(getChunks.data.count)
            setDocumentChunks(getChunks.data.chunks)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChunks.data])

    const openDS = (id) => {
        navigate('/documentStores/' + storeId)
    }

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid container direction='row'>
                        <div>
                            <h1>{getChunks.data?.file?.name}</h1>
                            <h3>Chunking Playground & Settings</h3>
                        </div>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <StyledButton variant='contained' sx={{ color: 'white' }} startIcon={<IconArrowBack />} onClick={openDS}>
                                Back to Document Store
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                {/*<Typography style={{ wordWrap: 'break-word', fontStyle: 'italic' }} variant='h5'>*/}
                {/*    {getChunks.data?.file?.totalChars?.toLocaleString()} Chars, {totalChunks} Chunks.*/}
                {/*</Typography>*/}
                <Box sx={{ p: 1 }}>
                    <Grid container>
                        <Grid item xs={6} md={6} lg={6} sm={6}>
                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 15 }}>
                                <Box sx={{ p: 2 }}>
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
                                    <Box sx={{ p: 2 }}>
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
                                    <Box sx={{ p: 2 }}>
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
                                    <Box sx={{ p: 2 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>Custom Separators</Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <OutlinedInput
                                            size='small'
                                            multiline={true}
                                            rows={2}
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
                                    <Box sx={{ p: 2 }}>
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

                                <Box sx={{ p: 2 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Chunk Size<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <InputSlider initialValue={100} />
                                    {/*<OutlinedInput*/}
                                    {/*    size='small'*/}
                                    {/*    multiline={false}*/}
                                    {/*    sx={{ mt: 1 }}*/}
                                    {/*    type='number'*/}
                                    {/*    fullWidth*/}
                                    {/*    key='chunkSize'*/}
                                    {/*    onChange={(e) => setChunkSize(e.target.value)}*/}
                                    {/*    value={chunkSize ?? 1000}*/}
                                    {/*/>*/}
                                </Box>
                                <Box sx={{ p: 2 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Chunk Overlap<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        size='small'
                                        multiline={false}
                                        sx={{ mt: 1 }}
                                        type='number'
                                        fullWidth
                                        key='chunkOverlap'
                                        onChange={(e) => setChunkOverlap(e.target.value)}
                                        value={chunkOverlap ?? 50}
                                    />
                                </Box>
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <StyledButton variant='contained' sx={{ color: 'white' }} >
                                        Preview
                                    </StyledButton>
                                    {'  '}
                                    <StyledButton variant='contained' sx={{ color: 'white' }}>
                                        Confirm & Process
                                    </StyledButton>
                                </Box>
                            </div>
                        </Grid>
                        <Grid item xs={6} md={6} lg={6} sm={6}>
                            <Grid
                                container
                                spacing={2}
                                style={{ borderLeftStyle: 'dashed', borderLeftWidth: 1, borderLeftColor: '#000000' }}
                            >
                                {documentChunks?.map((row, index) => (
                                    <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                        <CardWrapper>
                                            <Card style={{ padding: 0 }}>
                                                <CardContent style={{ padding: 0 }}>
                                                    <Typography color='textSecondary' gutterBottom>
                                                        {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                    </Typography>
                                                    <Typography sx={{ wordWrap: 'break-word' }} variant='body2' style={{ fontSize: 10 }}>
                                                        {row.pageContent}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </CardWrapper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>
            </MainCard>
        </>
    )
}

export default DocumentStoreChunks
