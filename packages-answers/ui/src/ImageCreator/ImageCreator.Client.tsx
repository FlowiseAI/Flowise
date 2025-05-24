'use client'
import { useState } from 'react'
import {
    Stack,
    TextField,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Dialog,
    DialogContent,
    IconButton,
    Skeleton,
    Chip,
    Tooltip,
    Tabs,
    Tab,
    Grid,
    Pagination,
    CircularProgress
} from '@mui/material'
import { IconDownload, IconX, IconFileDescription, IconPhoto, IconHistory } from '@tabler/icons-react'
import type { User } from 'types'

interface Message {
    id: string
    prompt: string
    images: Array<{
        type: 'url' | 'base64'
        data: string
        sessionId?: string
        jsonUrl?: string
    }>
    isGenerating?: boolean
}

interface ArchivedImage {
    sessionId: string
    imageUrl: string
    jsonUrl?: string
    timestamp: string
    fileName: string
}

interface ArchiveResponse {
    images: ArchivedImage[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasMore: boolean
    }
}

const ImageCreator = ({ user }: { user: User }) => {
    const [prompt, setPrompt] = useState('')
    const [n, setN] = useState(1)
    const [size, setSize] = useState('1024x1024')
    const [quality, setQuality] = useState('standard')
    const [model, setModel] = useState('dall-e-3')
    const [format, setFormat] = useState('png')
    const [background, setBackground] = useState('auto')
    const [style, setStyle] = useState('vivid')
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [fullSizeImage, setFullSizeImage] = useState<string | null>(null)
    const [currentTab, setCurrentTab] = useState(0)

    // Archive state
    const [archivedImages, setArchivedImages] = useState<ArchivedImage[]>([])
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archivePagination, setArchivePagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false
    })

    // Get available options based on selected model
    const getSizeOptions = (modelType?: string) => {
        const currentModel = modelType || model
        switch (currentModel) {
            case 'dall-e-2':
                return ['256x256', '512x512', '1024x1024']
            case 'dall-e-3':
                return ['1024x1024', '1792x1024', '1024x1792']
            case 'gpt-image-1':
                return ['1024x1024', '1536x1024', '1024x1536', 'auto']
            default:
                return ['1024x1024']
        }
    }

    const getQualityOptions = (modelType?: string) => {
        const currentModel = modelType || model
        switch (currentModel) {
            case 'dall-e-2':
                return ['standard']
            case 'dall-e-3':
                return ['standard', 'hd']
            case 'gpt-image-1':
                return ['auto', 'low', 'medium', 'high']
            default:
                return ['standard']
        }
    }

    const getMaxImages = (modelType?: string) => {
        const currentModel = modelType || model
        return currentModel === 'dall-e-3' ? 1 : 10
    }

    const getDefaultQuality = (modelType: string) => {
        switch (modelType) {
            case 'dall-e-2':
                return 'standard'
            case 'dall-e-3':
                return 'standard'
            case 'gpt-image-1':
                return 'low'
            default:
                return 'standard'
        }
    }

    const getDefaultSize = (modelType: string) => {
        const sizes = getSizeOptions(modelType)
        return sizes[0] // Always return the first available size as default
    }

    // Get image dimensions for placeholders
    const getImageDimensions = () => {
        const [width, height] = size.split('x').map(Number)
        const maxDisplayWidth = 256
        if (width && height) {
            const aspectRatio = width / height
            const displayWidth = Math.min(width, maxDisplayWidth)
            const displayHeight = displayWidth / aspectRatio
            return { width: displayWidth, height: displayHeight }
        }
        return { width: 256, height: 256 }
    }

    const downloadImage = async (imageSrc: string, fileName: string) => {
        try {
            const response = await fetch(imageSrc)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const downloadMetadata = async (jsonUrl: string, sessionId: string) => {
        try {
            const fullJsonUrl = `${process.env.NEXT_PUBLIC_FLOWISE_DOMAIN || 'http://localhost:4000'}${jsonUrl}`
            const response = await fetch(fullJsonUrl)
            const jsonData = await response.json()

            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `dalle_metadata_${sessionId}.json`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Metadata download failed:', error)
        }
    }

    const fetchArchivedImages = async (page = 1) => {
        setArchiveLoading(true)
        try {
            const response = await fetch(`/api/images/archive?page=${page}&limit=20`)
            if (response.ok) {
                const data: ArchiveResponse = await response.json()
                setArchivedImages(data.images)
                setArchivePagination(data.pagination)
            } else {
                console.error('Failed to fetch archived images')
            }
        } catch (error) {
            console.error('Error fetching archived images:', error)
        } finally {
            setArchiveLoading(false)
        }
    }

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue)
        if (newValue === 1 && archivedImages.length === 0) {
            fetchArchivedImages()
        }
    }

    const handleArchivePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        fetchArchivedImages(page)
    }

    const generate = async () => {
        if (!prompt) return
        setLoading(true)

        // Create a temporary message with loading placeholders
        const tempMessageId = Date.now().toString()
        const tempMessage: Message = {
            id: tempMessageId,
            prompt,
            images: Array.from({ length: Math.min(n, getMaxImages()) }, (_, i) => ({
                type: 'url' as const,
                data: `placeholder-${i}`
            })),
            isGenerating: true
        }

        // Add the temporary message at the top
        setMessages((prev) => [tempMessage, ...prev])

        try {
            // Build request body based on model
            const requestBody: {
                prompt: string
                model: string
                n: number
                size: string
                quality: string
                response_format: string
                style?: string
                output_format?: string
                background?: string
            } = {
                prompt,
                model,
                n: Math.min(n, getMaxImages()),
                size,
                quality,
                response_format: 'b64_json'
            }

            // Add model-specific parameters
            if (model === 'dall-e-3') {
                requestBody.style = style
            }

            if (model === 'gpt-image-1') {
                requestBody.output_format = format
                requestBody.background = background
            }

            const res = await fetch('/api/images/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            if (!res.ok) {
                const errorData = await res.json()
                console.error('Error generating image:', errorData)
                // Remove the temporary message on error
                setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
                return
            }

            const data = await res.json()
            const imgs =
                data.data?.map((d: { b64_json?: string; url?: string; sessionId?: string; jsonUrl?: string }) => {
                    // All images are now uploaded to storage and return URLs
                    if (d.url) {
                        return {
                            type: 'url',
                            data: d.url,
                            sessionId: d.sessionId,
                            jsonUrl: d.jsonUrl
                        }
                    }
                    // Fallback to base64 if storage upload failed
                    return { type: 'base64', data: d.b64_json }
                }) || []

            // Replace the temporary message with the actual images
            setMessages((prev) => prev.map((msg) => (msg.id === tempMessageId ? { ...msg, images: imgs, isGenerating: false } : msg)))
            setPrompt('')
        } catch (err) {
            console.error(err)
            // Remove the temporary message on error
            setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
        } finally {
            setLoading(false)
        }
    }

    // Reset dependent values when model changes
    const handleModelChange = (newModel: string) => {
        setModel(newModel)

        // Always set proper defaults for the new model to avoid empty states

        // Reset size - always set a valid default for the new model
        const validSizes = getSizeOptions(newModel)
        if (!validSizes.includes(size)) {
            setSize(getDefaultSize(newModel))
        }

        // Reset quality - always set a valid default for the new model
        const validQualities = getQualityOptions(newModel)
        if (!validQualities.includes(quality)) {
            setQuality(getDefaultQuality(newModel))
        }

        // Reset number of images if it exceeds the max for the new model
        const maxImages = getMaxImages(newModel)
        if (n > maxImages) {
            setN(1) // Always default to 1 image when switching to a more restrictive model
        }

        // Reset model-specific settings to defaults
        if (newModel === 'dall-e-3') {
            // Ensure DALL-E 3 specific settings are set
            if (!['vivid', 'natural'].includes(style)) {
                setStyle('vivid')
            }
        }

        if (newModel === 'gpt-image-1') {
            // Ensure GPT Image 1 specific settings are set
            if (!['png', 'jpeg', 'webp'].includes(format)) {
                setFormat('png')
            }
            if (!['auto', 'transparent', 'opaque'].includes(background)) {
                setBackground('auto')
            }
        }
    }

    const renderImagePlaceholder = (index: number) => {
        const { width, height } = getImageDimensions()
        return (
            <Box
                key={`placeholder-${index}`}
                sx={{
                    width,
                    height,
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                <Skeleton variant='rectangular' width='100%' height='100%' animation='wave' />
            </Box>
        )
    }

    return (
        <Stack spacing={3} sx={{ p: 2 }}>
            <Typography variant='h2' component='h1'>
                Image Creation
            </Typography>

            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                    📁 Organization: <strong>{user.org_name}</strong> | 👤 User: <strong>{user.email}</strong>
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    Images and metadata will be stored in your organization&apos;s secure folder structure.
                </Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label='image creation tabs'>
                    <Tab
                        icon={<IconPhoto size={20} />}
                        label='Generate'
                        id='tab-0'
                        aria-controls='tabpanel-0'
                        sx={{ textTransform: 'none' }}
                    />
                    <Tab
                        icon={<IconHistory size={20} />}
                        label='Archive'
                        id='tab-1'
                        aria-controls='tabpanel-1'
                        sx={{ textTransform: 'none' }}
                    />
                </Tabs>
            </Box>

            {/* Generate Tab Panel */}
            {currentTab === 0 && (
                <Box id='tabpanel-0' role='tabpanel' aria-labelledby='tab-0'>
                    <Stack spacing={3}>
                        <TextField
                            label='Prompt'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                        />

                        <Stack direction='row' spacing={2} flexWrap='wrap'>
                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='model-label'>Model</InputLabel>
                                <Select
                                    labelId='model-label'
                                    value={model}
                                    label='Model'
                                    onChange={(e) => handleModelChange(e.target.value)}
                                >
                                    <MenuItem value='dall-e-2'>DALL-E 2</MenuItem>
                                    <MenuItem value='dall-e-3'>DALL-E 3</MenuItem>
                                    <MenuItem value='gpt-image-1'>GPT Image 1</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='n-label'>Images</InputLabel>
                                <Select labelId='n-label' value={n} label='Images' onChange={(e) => setN(Number(e.target.value))}>
                                    {Array.from({ length: getMaxImages() }, (_, i) => i + 1).map((v) => (
                                        <MenuItem key={v} value={v}>
                                            {v}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='size-label'>Size</InputLabel>
                                <Select labelId='size-label' value={size} label='Size' onChange={(e) => setSize(e.target.value)}>
                                    {getSizeOptions().map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='quality-label'>Quality</InputLabel>
                                <Select
                                    labelId='quality-label'
                                    value={quality}
                                    label='Quality'
                                    onChange={(e) => setQuality(e.target.value)}
                                >
                                    {getQualityOptions().map((q) => (
                                        <MenuItem key={q} value={q}>
                                            {q.charAt(0).toUpperCase() + q.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        {/* DALL-E 3 specific controls */}
                        {model === 'dall-e-3' && (
                            <Stack direction='row' spacing={2}>
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel id='style-label'>Style</InputLabel>
                                    <Select labelId='style-label' value={style} label='Style' onChange={(e) => setStyle(e.target.value)}>
                                        <MenuItem value='vivid'>Vivid</MenuItem>
                                        <MenuItem value='natural'>Natural</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        )}

                        {/* GPT Image 1 specific controls */}
                        {model === 'gpt-image-1' && (
                            <Stack direction='row' spacing={2}>
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel id='format-label'>Format</InputLabel>
                                    <Select
                                        labelId='format-label'
                                        value={format}
                                        label='Format'
                                        onChange={(e) => setFormat(e.target.value)}
                                    >
                                        <MenuItem value='png'>PNG</MenuItem>
                                        <MenuItem value='jpeg'>JPEG</MenuItem>
                                        <MenuItem value='webp'>WebP</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel id='background-label'>Background</InputLabel>
                                    <Select
                                        labelId='background-label'
                                        value={background}
                                        label='Background'
                                        onChange={(e) => setBackground(e.target.value)}
                                    >
                                        <MenuItem value='auto'>Auto</MenuItem>
                                        <MenuItem value='transparent'>Transparent</MenuItem>
                                        <MenuItem value='opaque'>Opaque</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        )}

                        <Button variant='contained' onClick={generate} disabled={loading || !prompt}>
                            {loading ? 'Generating...' : 'Generate'}
                        </Button>

                        <Stack spacing={4}>
                            {messages.map((msg) => (
                                <Box key={msg.id}>
                                    <Typography variant='subtitle1' gutterBottom>
                                        {msg.prompt}
                                    </Typography>
                                    <Stack direction='row' spacing={2} flexWrap='wrap'>
                                        {msg.isGenerating
                                            ? msg.images.map((_, i) => renderImagePlaceholder(i))
                                            : msg.images.map((img, i) => {
                                                  // Determine the image source based on type
                                                  const imageSrc =
                                                      img.type === 'url'
                                                          ? `${process.env.NEXT_PUBLIC_FLOWISE_DOMAIN || 'http://localhost:4000'}${
                                                                img.data
                                                            }`
                                                          : `data:image/png;base64,${img.data}`

                                                  const fileName = `generated-image-${img.sessionId || Date.now()}-${i + 1}.${
                                                      format || 'png'
                                                  }`

                                                  return (
                                                      <Box
                                                          key={`image-${msg.id}-${i}`}
                                                          sx={{ position: 'relative', display: 'inline-block' }}
                                                      >
                                                          <Box
                                                              component='img'
                                                              src={imageSrc}
                                                              alt={`Generated image ${i + 1}`}
                                                              sx={{
                                                                  maxWidth: 256,
                                                                  borderRadius: 1,
                                                                  cursor: 'pointer',
                                                                  transition: 'transform 0.2s',
                                                                  '&:hover': {
                                                                      transform: 'scale(1.02)'
                                                                  }
                                                              }}
                                                              onClick={() => setFullSizeImage(imageSrc)}
                                                          />

                                                          {/* Action buttons */}
                                                          <Box
                                                              sx={{
                                                                  position: 'absolute',
                                                                  top: 8,
                                                                  right: 8,
                                                                  display: 'flex',
                                                                  gap: 1
                                                              }}
                                                          >
                                                              {/* Download metadata button - only show if jsonUrl is available */}
                                                              {img.jsonUrl && img.sessionId && (
                                                                  <Tooltip title='Download metadata (JSON)'>
                                                                      <IconButton
                                                                          size='small'
                                                                          sx={{
                                                                              backgroundColor: 'rgba(25, 118, 210, 0.8)',
                                                                              color: 'white',
                                                                              '&:hover': {
                                                                                  backgroundColor: 'rgba(25, 118, 210, 0.9)'
                                                                              }
                                                                          }}
                                                                          onClick={() => downloadMetadata(img.jsonUrl, img.sessionId)}
                                                                      >
                                                                          <IconFileDescription size={16} />
                                                                      </IconButton>
                                                                  </Tooltip>
                                                              )}

                                                              {/* Download image button */}
                                                              <Tooltip title='Download image'>
                                                                  <IconButton
                                                                      size='small'
                                                                      sx={{
                                                                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                                          color: 'white',
                                                                          '&:hover': {
                                                                              backgroundColor: 'rgba(0, 0, 0, 0.9)'
                                                                          }
                                                                      }}
                                                                      onClick={() => downloadImage(imageSrc, fileName)}
                                                                  >
                                                                      <IconDownload size={16} />
                                                                  </IconButton>
                                                              </Tooltip>
                                                          </Box>

                                                          {/* Metadata indicator */}
                                                          {img.sessionId && (
                                                              <Chip
                                                                  label={`ID: ${img.sessionId.slice(-8)}`}
                                                                  size='small'
                                                                  sx={{
                                                                      position: 'absolute',
                                                                      bottom: 8,
                                                                      left: 8,
                                                                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                                      color: 'white',
                                                                      fontSize: '0.7rem'
                                                                  }}
                                                              />
                                                          )}
                                                      </Box>
                                                  )
                                              })}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Stack>
                </Box>
            )}

            {/* Archive Tab Panel */}
            {currentTab === 1 && (
                <Box id='tabpanel-1' role='tabpanel' aria-labelledby='tab-1'>
                    {archiveLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Stack spacing={3}>
                            {archivedImages.length === 0 ? (
                                <Typography variant='body1' color='text.secondary' textAlign='center' py={4}>
                                    No archived images found. Generate some images to see them here!
                                </Typography>
                            ) : (
                                <>
                                    <Typography variant='h6' gutterBottom>
                                        Archived Images ({archivePagination.total} total)
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {archivedImages.map((img) => {
                                            const imageSrc = `${process.env.NEXT_PUBLIC_FLOWISE_DOMAIN || 'http://localhost:4000'}${
                                                img.imageUrl
                                            }`
                                            const fileName = `archived-${img.sessionId}.png`

                                            return (
                                                <Grid item xs={12} sm={6} md={4} lg={3} key={img.sessionId}>
                                                    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                                        <Box
                                                            component='img'
                                                            src={imageSrc}
                                                            alt={`Archived image ${img.sessionId}`}
                                                            sx={{
                                                                width: '100%',
                                                                height: 200,
                                                                objectFit: 'cover',
                                                                borderRadius: 1,
                                                                cursor: 'pointer',
                                                                transition: 'transform 0.2s',
                                                                '&:hover': {
                                                                    transform: 'scale(1.02)'
                                                                }
                                                            }}
                                                            onClick={() => setFullSizeImage(imageSrc)}
                                                        />

                                                        {/* Action buttons */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                display: 'flex',
                                                                gap: 1
                                                            }}
                                                        >
                                                            {/* Download metadata button */}
                                                            {img.jsonUrl && (
                                                                <Tooltip title='Download metadata (JSON)'>
                                                                    <IconButton
                                                                        size='small'
                                                                        sx={{
                                                                            backgroundColor: 'rgba(25, 118, 210, 0.8)',
                                                                            color: 'white',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(25, 118, 210, 0.9)'
                                                                            }
                                                                        }}
                                                                        onClick={() => {
                                                                            if (img.jsonUrl) {
                                                                                downloadMetadata(img.jsonUrl, img.sessionId)
                                                                            }
                                                                        }}
                                                                    >
                                                                        <IconFileDescription size={16} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}

                                                            {/* Download image button */}
                                                            <Tooltip title='Download image'>
                                                                <IconButton
                                                                    size='small'
                                                                    sx={{
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                                        color: 'white',
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(0, 0, 0, 0.9)'
                                                                        }
                                                                    }}
                                                                    onClick={() => downloadImage(imageSrc, fileName)}
                                                                >
                                                                    <IconDownload size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>

                                                        {/* Metadata */}
                                                        <Box sx={{ mt: 1 }}>
                                                            <Chip
                                                                label={`ID: ${img.sessionId.slice(-8)}`}
                                                                size='small'
                                                                sx={{ fontSize: '0.7rem', mb: 0.5 }}
                                                            />
                                                            <Typography variant='caption' color='text.secondary' display='block'>
                                                                {new Date(img.timestamp).toLocaleDateString()} at{' '}
                                                                {new Date(img.timestamp).toLocaleTimeString()}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            )
                                        })}
                                    </Grid>

                                    {/* Pagination */}
                                    {archivePagination.totalPages > 1 && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                            <Pagination
                                                count={archivePagination.totalPages}
                                                page={archivePagination.page}
                                                onChange={handleArchivePageChange}
                                                color='primary'
                                                size='large'
                                            />
                                        </Box>
                                    )}
                                </>
                            )}
                        </Stack>
                    )}
                </Box>
            )}

            {/* Full size image dialog */}
            <Dialog
                open={!!fullSizeImage}
                onClose={() => setFullSizeImage(null)}
                maxWidth='lg'
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible'
                    }
                }}
            >
                <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <IconButton
                        onClick={() => setFullSizeImage(null)}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            zIndex: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.9)'
                            }
                        }}
                    >
                        <IconX />
                    </IconButton>
                    {fullSizeImage && (
                        <Box
                            component='img'
                            src={fullSizeImage}
                            alt='Full size image'
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: 1
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Stack>
    )
}

export default ImageCreator
