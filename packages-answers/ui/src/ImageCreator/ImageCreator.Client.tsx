'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
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
    Modal,
    IconButton,
    Skeleton,
    Chip,
    Tooltip,
    Tabs,
    Tab,
    Grid,
    Pagination,
    CircularProgress,
    Checkbox
} from '@mui/material'
import {
    IconDownload,
    IconX,
    IconFileDescription,
    IconPhoto,
    IconHistory,
    IconChevronLeft,
    IconChevronRight,
    IconCheck
} from '@tabler/icons-react'
import JSZip from 'jszip'

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
    saved?: boolean // Track if images have been saved to archive
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

const ImageCreator = () => {
    const { user, isLoading } = useUser()
    const [prompt, setPrompt] = useState('')
    const [n, setN] = useState(1) // Default to 1 image
    const [size, setSize] = useState('1024x1024')
    const [quality, setQuality] = useState('standard')
    const [model, setModel] = useState('dall-e-3')
    const [format, setFormat] = useState('png')
    const [background, setBackground] = useState('auto')
    const [style, setStyle] = useState('vivid')
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [fullSizeImage, setFullSizeImage] = useState<string | null>(null)
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
    const [currentImageSource, setCurrentImageSource] = useState<'generate' | 'archive'>('generate')
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

    // Selection state for bulk download
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
    const [selectMode, setSelectMode] = useState(false)

    // Add/remove keyboard event listener
    useEffect(() => {
        if (fullSizeImage) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [fullSizeImage, currentImageIndex])

    // Auto-refresh archive when new images are saved
    useEffect(() => {
        if (messages.some((msg) => msg.saved)) {
            fetchArchivedImages() // Refresh archive
        }
    }, [messages])

    if (isLoading) {
        return (
            <Stack spacing={3} sx={{ p: 3 }}>
                <Typography variant='h2' component='h1'>
                    Image Creator
                </Typography>
                <Typography>Loading...</Typography>
            </Stack>
        )
    }

    if (!user) {
        // console.log('ImageCreator: No user object')
        return (
            <Stack spacing={3} sx={{ p: 3 }}>
                <Typography variant='h2' component='h1'>
                    Image Creator
                </Typography>
                <Typography>Please log in to use the Image Creator.</Typography>
            </Stack>
        )
    }

    // console.log('ImageCreator user loaded:', user)

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
            const fullJsonUrl = `${user.chatflowDomain}${jsonUrl}`
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
            // console.log('Fetching archived images for user:', {
            //     userId: user.id || user.sub,
            //     organizationId: user.organizationId || user.org_id,
            //     email: user.email,
            //     orgName: user.org_name
            // })

            // Follow the same pattern as chat flow - make authenticated request directly to backend
            const flowiseDomain = user.chatflowDomain
            const accessToken = sessionStorage.getItem('access_token')

            if (!accessToken) {
                console.error('No access token available for authenticated request')
                return
            }

            const response = await fetch(`${flowiseDomain}/api/v1/dalle-image/archive?page=${page}&limit=20`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })

            if (response.ok) {
                const data: ArchiveResponse = await response.json()
                // console.log('Archive response:', data)
                setArchivedImages(data.images)
                setArchivePagination(data.pagination)
            } else {
                console.error('Failed to fetch archived images', response.status, response.statusText)
                const errorText = await response.text()
                console.error('Error response:', errorText)
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

    // Selection helper functions
    const handleImageSelection = (sessionId: string, checked: boolean) => {
        setSelectedImages((prev) => {
            const newSet = new Set(prev)
            if (checked) {
                newSet.add(sessionId)
            } else {
                newSet.delete(sessionId)
            }
            return newSet
        })
    }

    const selectAll = () => {
        setSelectedImages(new Set(archivedImages.map((img) => img.sessionId)))
    }

    const clearSelection = () => {
        setSelectedImages(new Set())
    }

    const downloadSelected = async () => {
        if (selectedImages.size === 0) return

        try {
            const zip = new JSZip()
            const selectedArray = Array.from(selectedImages)

            // Show loading state
            console.log(`Creating zip file with ${selectedArray.length} images...`)

            // Add each selected image to the zip
            for (const sessionId of selectedArray) {
                const img = archivedImages.find((img) => img.sessionId === sessionId)
                if (img) {
                    try {
                        const imageSrc = `${user.chatflowDomain}${img.imageUrl}`
                        const response = await fetch(imageSrc)
                        const blob = await response.blob()

                        // Add image to zip with descriptive filename
                        const fileName = `archived-${img.sessionId}.png`
                        zip.file(fileName, blob)

                        console.log(`Added to zip: ${fileName}`)
                    } catch (error) {
                        console.error(`Failed to add image ${sessionId} to zip:`, error)
                    }
                }
            }

            // Generate and download the zip file
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const zipUrl = window.URL.createObjectURL(zipBlob)
            const link = document.createElement('a')
            link.href = zipUrl
            link.download = `archived-images-${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(zipUrl)

            console.log('Zip file downloaded successfully!')

            // Clear selection after successful download
            setSelectedImages(new Set())
        } catch (error) {
            console.error('Failed to create zip file:', error)
        }
    }

    // Lightbox navigation functions
    const openLightbox = (imageSrc: string, imageIndex: number, source: 'generate' | 'archive' = 'generate') => {
        setFullSizeImage(imageSrc)
        setCurrentImageIndex(imageIndex)
        // Store the source to know which tab we're viewing
        setCurrentImageSource(source)
    }

    const closeLightbox = () => {
        setFullSizeImage(null)
        setCurrentImageIndex(0)
        setCurrentImageSource('generate')
    }

    const goToNextImage = () => {
        const currentSource = currentImageSource
        let totalImages = 0
        let nextImageSrc = ''
        let nextIndex = 0

        if (currentSource === 'archive') {
            totalImages = archivedImages.length
            if (currentImageIndex < totalImages - 1) {
                nextIndex = currentImageIndex + 1
                const nextImage = archivedImages[nextIndex]
                nextImageSrc = `${user.chatflowDomain}${nextImage.imageUrl}`
            }
        } else {
            // For generate tab, we need to find the current message and navigate within it
            const currentMessage = messages.find((msg) =>
                msg.images.some((img) => {
                    const imgSrc = img.type === 'url' ? `${user.chatflowDomain}${img.data}` : `data:image/png;base64,${img.data}`
                    return imgSrc === fullSizeImage
                })
            )

            if (currentMessage) {
                totalImages = currentMessage.images.length
                if (currentImageIndex < totalImages - 1) {
                    nextIndex = currentImageIndex + 1
                    const nextImg = currentMessage.images[nextIndex]
                    nextImageSrc =
                        nextImg.type === 'url' ? `${user.chatflowDomain}${nextImg.data}` : `data:image/png;base64,${nextImg.data}`
                }
            }
        }

        if (nextImageSrc) {
            setFullSizeImage(nextImageSrc)
            setCurrentImageIndex(nextIndex)
        }
    }

    const goToPreviousImage = () => {
        const currentSource = currentImageSource
        let prevImageSrc = ''
        let prevIndex = 0

        if (currentSource === 'archive') {
            if (currentImageIndex > 0) {
                prevIndex = currentImageIndex - 1
                const prevImage = archivedImages[prevIndex]
                prevImageSrc = `${user.chatflowDomain}${prevImage.imageUrl}`
            }
        } else {
            // For generate tab, navigate within the current message
            const currentMessage = messages.find((msg) =>
                msg.images.some((img) => {
                    const imgSrc = img.type === 'url' ? `${user.chatflowDomain}${img.data}` : `data:image/png;base64,${img.data}`
                    return imgSrc === fullSizeImage
                })
            )

            if (currentMessage && currentImageIndex > 0) {
                prevIndex = currentImageIndex - 1
                const prevImg = currentMessage.images[prevIndex]
                prevImageSrc = prevImg.type === 'url' ? `${user.chatflowDomain}${prevImg.data}` : `data:image/png;base64,${prevImg.data}`
            }
        }

        if (prevImageSrc) {
            setFullSizeImage(prevImageSrc)
            setCurrentImageIndex(prevIndex)
        }
    }

    // Handle keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
        if (!fullSizeImage) return

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault()
                goToPreviousImage()
                break
            case 'ArrowRight':
                event.preventDefault()
                goToNextImage()
                break
            case 'Escape':
                event.preventDefault()
                closeLightbox()
                break
        }
    }

    const generate = async () => {
        if (!prompt) return
        setLoading(true)

        // Create a temporary message with loading placeholders
        const tempMessageId = Date.now().toString()
        const tempMessage: Message = {
            id: tempMessageId,
            prompt,
            images: [],
            isGenerating: true
        }

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
                organizationId?: string
                userId?: string
                userEmail?: string
            } = {
                prompt,
                model,
                n: 1, // Always generate 1 at a time for sequential generation
                size,
                quality,
                response_format: 'b64_json',
                organizationId: (user.organizationId as string) || (user.org_id as string) || undefined,
                userId: (user.id as string) || (user.sub as string) || undefined,
                userEmail: (user.email as string) || undefined
            }

            // Add model-specific parameters
            if (model === 'dall-e-3') {
                requestBody.style = style
            }

            if (model === 'gpt-image-1') {
                requestBody.output_format = format
                requestBody.background = background
            }

            // Follow the same pattern as chat flow - make authenticated request directly to backend
            const flowiseDomain = user.chatflowDomain
            const accessToken = sessionStorage.getItem('access_token')
            // console.log('ImageCreator API call:', { flowiseDomain, accessToken: !!accessToken, requestBody })

            if (!accessToken) {
                console.error('No access token available for authenticated request')
                // Remove the temporary message on error
                setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
                return
            }

            // Generate images sequentially
            const targetImages = n
            const allImages: any[] = []

            for (let i = 0; i < targetImages; i++) {
                try {
                    const res = await fetch(`${flowiseDomain}/api/v1/dalle-image/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`
                        },
                        body: JSON.stringify(requestBody)
                    })

                    if (!res.ok) {
                        const errorData = await res.json()
                        console.error('Error generating image:', errorData)
                        // Continue with next image instead of failing completely
                        continue
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

                    // Add new images to the collection
                    allImages.push(...imgs)

                    // Update the message with current progress
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === tempMessageId ? { ...msg, images: [...allImages], isGenerating: i < targetImages - 1 } : msg
                        )
                    )

                    // Small delay between requests to avoid overwhelming the API
                    if (i < targetImages - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 500))
                    }
                } catch (err) {
                    console.error(`Error generating image ${i + 1}:`, err)
                    // Continue with next image instead of failing completely
                }
            }

            // Final update to mark generation as complete and saved (only if images were actually generated)
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === tempMessageId ? { ...msg, images: allImages, isGenerating: false, saved: allImages.length > 0 } : msg
                )
            )

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

        // No need to reset number of images since we handle sequential generation for all models

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
                    📁 Organization: <strong>{(user as any).org_name || 'Unknown'}</strong> | 👤 User:{' '}
                    <strong>{user.email || 'Unknown'}</strong>
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
                            disabled={loading}
                        />

                        <Stack direction='row' spacing={2} flexWrap='wrap'>
                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='model-label'>Model</InputLabel>
                                <Select
                                    labelId='model-label'
                                    value={model}
                                    label='Model'
                                    onChange={(e) => handleModelChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <MenuItem value='dall-e-2'>DALL-E 2</MenuItem>
                                    <MenuItem value='dall-e-3'>DALL-E 3</MenuItem>
                                    <MenuItem value='gpt-image-1'>GPT Image 1</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='n-label'>Images</InputLabel>
                                <Select
                                    labelId='n-label'
                                    value={n}
                                    label='Images'
                                    onChange={(e) => setN(Number(e.target.value))}
                                    disabled={loading}
                                >
                                    {Array.from({ length: 4 }, (_, i) => i + 1).map((v) => (
                                        <MenuItem key={v} value={v}>
                                            {v}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel id='size-label'>Size</InputLabel>
                                <Select
                                    labelId='size-label'
                                    value={size}
                                    label='Size'
                                    onChange={(e) => setSize(e.target.value)}
                                    disabled={loading}
                                >
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
                                    disabled={loading}
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
                                    <Select
                                        labelId='style-label'
                                        value={style}
                                        label='Style'
                                        onChange={(e) => setStyle(e.target.value)}
                                        disabled={loading}
                                    >
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
                                        disabled={loading}
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
                                        disabled={loading}
                                    >
                                        <MenuItem value='auto'>Auto</MenuItem>
                                        <MenuItem value='transparent'>Transparent</MenuItem>
                                        <MenuItem value='opaque'>Opaque</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        )}

                        <Button variant='contained' onClick={generate} disabled={loading || !prompt}>
                            {loading ? 'Generating & Saving...' : 'Generate'}
                        </Button>

                        <Stack spacing={4}>
                            {messages.map((msg) => (
                                <Box
                                    key={msg.id}
                                    sx={{
                                        backgroundColor: 'background.paper',
                                        borderRadius: 2,
                                        p: 3,
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <Typography variant='h6' gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                                        &ldquo;{msg.prompt}&rdquo;
                                    </Typography>
                                    {/* Success message when images are saved */}
                                    {msg.saved && (
                                        <Box sx={{ mb: 2 }}>
                                            <Chip
                                                icon={<IconCheck size={16} />}
                                                label='Images saved to archive'
                                                color='success'
                                                variant='outlined'
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </Box>
                                    )}

                                    <Grid container spacing={2}>
                                        {msg.images.map((img, i) => {
                                            // Determine the image source based on type
                                            const imageSrc =
                                                img.type === 'url'
                                                    ? `${user.chatflowDomain}${img.data}`
                                                    : `data:image/png;base64,${img.data}`

                                            const fileName = `generated-image-${img.sessionId || Date.now()}-${i + 1}.${format || 'png'}`

                                            return (
                                                <Grid item xs={12} sm={6} md={4} lg={3} key={`image-${msg.id}-${i}`}>
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            backgroundColor: 'background.paper',
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                            transition: 'all 0.3s ease-in-out',
                                                            '&:hover': {
                                                                transform: 'translateY(-4px)',
                                                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                                                            }
                                                        }}
                                                    >
                                                        {/* Image Container */}
                                                        <Box
                                                            sx={{
                                                                position: 'relative',
                                                                width: '100%',
                                                                height: 220,
                                                                overflow: 'hidden',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => openLightbox(imageSrc, i, 'generate')}
                                                        >
                                                            <Box
                                                                component='img'
                                                                src={imageSrc}
                                                                alt={`Generated image ${i + 1}`}
                                                                sx={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                    transition: 'transform 0.3s ease-in-out',
                                                                    '&:hover': {
                                                                        transform: 'scale(1.05)'
                                                                    }
                                                                }}
                                                            />

                                                            {/* Hover overlay */}
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                                    opacity: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'opacity 0.3s ease-in-out',
                                                                    '&:hover': {
                                                                        opacity: 1
                                                                    }
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant='body2'
                                                                    sx={{
                                                                        color: 'white',
                                                                        fontWeight: 500,
                                                                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                                                                    }}
                                                                >
                                                                    Click to view full size
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        {/* Action buttons */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 12,
                                                                right: 12,
                                                                display: 'flex',
                                                                gap: 1,
                                                                zIndex: 2
                                                            }}
                                                        >
                                                            {/* Download metadata button - only show if jsonUrl is available */}
                                                            {img.jsonUrl && img.sessionId && (
                                                                <Tooltip title='Download metadata (JSON)'>
                                                                    <IconButton
                                                                        size='small'
                                                                        sx={{
                                                                            backgroundColor: 'rgba(25, 118, 210, 0.9)',
                                                                            color: 'white',
                                                                            width: 32,
                                                                            height: 32,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(25, 118, 210, 1)',
                                                                                transform: 'scale(1.1)'
                                                                            },
                                                                            transition: 'all 0.2s ease-in-out'
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            if (img.jsonUrl && img.sessionId) {
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
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                                        color: 'white',
                                                                        width: 32,
                                                                        height: 32,
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(0, 0, 0, 1)',
                                                                            transform: 'scale(1.1)'
                                                                        },
                                                                        transition: 'all 0.2s ease-in-out'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        downloadImage(imageSrc, fileName)
                                                                    }}
                                                                >
                                                                    <IconDownload size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>

                                                        {/* Metadata */}
                                                        <Box sx={{ p: 2, pt: 1.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <Chip
                                                                    label={`Image ${i + 1}`}
                                                                    size='small'
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        backgroundColor: 'secondary.main',
                                                                        color: 'white',
                                                                        fontWeight: 500
                                                                    }}
                                                                />
                                                                {img.sessionId && (
                                                                    <Chip
                                                                        label={`ID: ${img.sessionId.slice(-8)}`}
                                                                        size='small'
                                                                        sx={{
                                                                            fontSize: '0.7rem',
                                                                            backgroundColor: 'primary.main',
                                                                            color: 'white',
                                                                            fontWeight: 500
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>
                                                            <Typography
                                                                variant='caption'
                                                                color='text.secondary'
                                                                sx={{
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                Generated with {model} • {size}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            )
                                        })}

                                        {/* Show placeholders for remaining images that are still generating */}
                                        {msg.isGenerating &&
                                            Array.from({ length: n - msg.images.length }, (_, i) => (
                                                <Grid
                                                    item
                                                    xs={12}
                                                    sm={6}
                                                    md={4}
                                                    lg={3}
                                                    key={`placeholder-${msg.id}-${msg.images.length + i}`}
                                                >
                                                    {renderImagePlaceholder(msg.images.length + i)}
                                                </Grid>
                                            ))}
                                    </Grid>
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

                                    {/* Selection controls */}
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                                        <Button
                                            variant={selectMode ? 'contained' : 'outlined'}
                                            onClick={() => setSelectMode(!selectMode)}
                                            startIcon={selectMode ? <IconX size={16} /> : <IconCheck size={16} />}
                                        >
                                            {selectMode ? 'Exit Select' : 'Select Images'}
                                        </Button>

                                        {selectMode && (
                                            <>
                                                <Button variant='outlined' onClick={selectAll} size='small'>
                                                    Select All
                                                </Button>
                                                <Button variant='outlined' onClick={clearSelection} size='small'>
                                                    Clear
                                                </Button>
                                                <Button
                                                    variant='contained'
                                                    onClick={downloadSelected}
                                                    disabled={selectedImages.size === 0}
                                                    startIcon={<IconDownload size={16} />}
                                                    size='small'
                                                >
                                                    Download as ZIP ({selectedImages.size})
                                                </Button>
                                            </>
                                        )}
                                    </Box>
                                    <Grid container spacing={3}>
                                        {archivedImages.map((img) => {
                                            const imageSrc = `${user.chatflowDomain}${img.imageUrl}`
                                            const fileName = `archived-${img.sessionId}.png`

                                            return (
                                                <Grid item xs={12} sm={6} md={4} lg={3} key={img.sessionId}>
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            backgroundColor: 'background.paper',
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                            transition: 'all 0.3s ease-in-out',
                                                            '&:hover': {
                                                                transform: 'translateY(-4px)',
                                                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                                                            }
                                                        }}
                                                    >
                                                        {/* Selection checkbox */}
                                                        {selectMode && (
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 8,
                                                                    left: 8,
                                                                    zIndex: 3,
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                                    borderRadius: 1
                                                                }}
                                                            >
                                                                <Checkbox
                                                                    checked={selectedImages.has(img.sessionId)}
                                                                    onChange={(e) => handleImageSelection(img.sessionId, e.target.checked)}
                                                                    size='small'
                                                                />
                                                            </Box>
                                                        )}
                                                        {/* Image Container */}
                                                        <Box
                                                            sx={{
                                                                position: 'relative',
                                                                width: '100%',
                                                                height: 220,
                                                                overflow: 'hidden',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => openLightbox(imageSrc, archivedImages.indexOf(img), 'archive')}
                                                        >
                                                            <Box
                                                                component='img'
                                                                src={imageSrc}
                                                                alt={`Archived image ${img.sessionId}`}
                                                                sx={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                    transition: 'transform 0.3s ease-in-out',
                                                                    '&:hover': {
                                                                        transform: 'scale(1.05)'
                                                                    }
                                                                }}
                                                            />

                                                            {/* Hover overlay */}
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                                    opacity: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'opacity 0.3s ease-in-out',
                                                                    '&:hover': {
                                                                        opacity: 1
                                                                    }
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant='body2'
                                                                    sx={{
                                                                        color: 'white',
                                                                        fontWeight: 500,
                                                                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                                                                    }}
                                                                >
                                                                    Click to view full size
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        {/* Action buttons */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 12,
                                                                right: 12,
                                                                display: 'flex',
                                                                gap: 1,
                                                                zIndex: 2
                                                            }}
                                                        >
                                                            {/* Download metadata button */}
                                                            {img.jsonUrl && (
                                                                <Tooltip title='Download metadata (JSON)'>
                                                                    <IconButton
                                                                        size='small'
                                                                        sx={{
                                                                            backgroundColor: 'rgba(25, 118, 210, 0.9)',
                                                                            color: 'white',
                                                                            width: 32,
                                                                            height: 32,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(25, 118, 210, 1)',
                                                                                transform: 'scale(1.1)'
                                                                            },
                                                                            transition: 'all 0.2s ease-in-out'
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            if (img.jsonUrl && img.sessionId) {
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
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                                        color: 'white',
                                                                        width: 32,
                                                                        height: 32,
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(0, 0, 0, 1)',
                                                                            transform: 'scale(1.1)'
                                                                        },
                                                                        transition: 'all 0.2s ease-in-out'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        downloadImage(imageSrc, fileName)
                                                                    }}
                                                                >
                                                                    <IconDownload size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>

                                                        {/* Metadata */}
                                                        <Box sx={{ p: 2, pt: 1.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <Chip
                                                                    label={`ID: ${img.sessionId.slice(-8)}`}
                                                                    size='small'
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        backgroundColor: 'primary.main',
                                                                        color: 'white',
                                                                        fontWeight: 500
                                                                    }}
                                                                />
                                                                <Typography
                                                                    variant='caption'
                                                                    color='text.secondary'
                                                                    sx={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    {new Date(img.timestamp).toLocaleDateString()} at{' '}
                                                                    {new Date(img.timestamp).toLocaleTimeString()}
                                                                </Typography>
                                                            </Box>
                                                            {img.fileName && (
                                                                <Typography
                                                                    variant='caption'
                                                                    color='text.secondary'
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        fontStyle: 'italic'
                                                                    }}
                                                                >
                                                                    {img.fileName}
                                                                </Typography>
                                                            )}
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

            {/* Full size image lightbox */}
            <Modal
                open={!!fullSizeImage}
                onClose={closeLightbox}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2
                }}
                BackdropProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(4px)'
                    }
                }}
                disableEscapeKeyDown={false}
                closeAfterTransition
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        maxWidth: '95vw',
                        maxHeight: '95vh'
                    }}
                >
                    {/* Close button */}
                    <IconButton
                        onClick={closeLightbox}
                        sx={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            zIndex: 1,
                            width: 40,
                            height: 40,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 1)',
                                transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        <IconX size={20} />
                    </IconButton>

                    {/* Navigation arrows */}
                    {currentImageIndex > 0 && (
                        <IconButton
                            onClick={goToPreviousImage}
                            sx={{
                                position: 'absolute',
                                left: -60,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                width: 48,
                                height: 48,
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 1)',
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <IconChevronLeft size={24} />
                        </IconButton>
                    )}

                    {currentImageIndex < archivedImages.length - 1 && (
                        <IconButton
                            onClick={goToNextImage}
                            sx={{
                                position: 'absolute',
                                right: -60,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                width: 48,
                                height: 48,
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 1)',
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <IconChevronRight size={24} />
                        </IconButton>
                    )}

                    {/* Image counter */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -20,
                            left: -20,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: 2,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            zIndex: 1
                        }}
                    >
                        {currentImageIndex + 1} of{' '}
                        {currentImageSource === 'archive'
                            ? archivedImages.length
                            : (() => {
                                  const currentMessage = messages.find((msg) =>
                                      msg.images.some((img) => {
                                          const imgSrc =
                                              img.type === 'url' ? `${user.chatflowDomain}${img.data}` : `data:image/png;base64,${img.data}`
                                          return imgSrc === fullSizeImage
                                      })
                                  )
                                  return currentMessage ? currentMessage.images.length : 1
                              })()}
                    </Box>

                    {/* Main image */}
                    {fullSizeImage && (
                        <Box
                            component='img'
                            src={fullSizeImage}
                            alt='Full size image'
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: 2,
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                transition: 'transform 0.3s ease-in-out',
                                '&:hover': {
                                    transform: 'scale(1.02)'
                                }
                            }}
                        />
                    )}
                </Box>
            </Modal>
        </Stack>
    )
}

export default ImageCreator
