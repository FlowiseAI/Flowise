'use client'
import { useState } from 'react'
import { Stack, TextField, Typography, Button, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material'
import type { User } from 'types'

interface Message {
    prompt: string
    images: Array<{ type: 'url' | 'base64'; data: string }>
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

    // Get available options based on selected model
    const getSizeOptions = () => {
        switch (model) {
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

    const getQualityOptions = () => {
        switch (model) {
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

    const getMaxImages = () => {
        return model === 'dall-e-3' ? 1 : 10
    }

    const generate = async () => {
        if (!prompt) return
        setLoading(true)
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
                return
            }

            const data = await res.json()
            const imgs =
                data.data?.map((d: { b64_json?: string; url?: string }) => {
                    // All images are now uploaded to storage and return URLs
                    if (d.url) {
                        return { type: 'url', data: d.url }
                    }
                    // Fallback to base64 if storage upload failed
                    return { type: 'base64', data: d.b64_json }
                }) || []
            setMessages((prev) => [...prev, { prompt, images: imgs }])
            setPrompt('')
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Reset dependent values when model changes
    const handleModelChange = (newModel: string) => {
        setModel(newModel)

        // Reset size if current size is not valid for new model
        const validSizes = getSizeOptions()
        if (!validSizes.includes(size)) {
            setSize(validSizes[0])
        }

        // Reset quality if current quality is not valid for new model
        const validQualities = getQualityOptions()
        if (!validQualities.includes(quality)) {
            setQuality(validQualities[0])
        }

        // Reset n if current n exceeds max for new model
        const maxImages = getMaxImages()
        if (n > maxImages) {
            setN(maxImages)
        }
    }

    return (
        <Stack spacing={3} sx={{ p: 2 }}>
            <Typography variant='h2' component='h1'>
                Image Creation
            </Typography>
            <TextField label='Prompt' value={prompt} onChange={(e) => setPrompt(e.target.value)} multiline minRows={3} fullWidth />

            <Stack direction='row' spacing={2} flexWrap='wrap'>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id='model-label'>Model</InputLabel>
                    <Select labelId='model-label' value={model} label='Model' onChange={(e) => handleModelChange(e.target.value)}>
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
                    <Select labelId='quality-label' value={quality} label='Quality' onChange={(e) => setQuality(e.target.value)}>
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
                        <Select labelId='format-label' value={format} label='Format' onChange={(e) => setFormat(e.target.value)}>
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
                {messages.map((msg, idx) => (
                    <Box key={`message-${idx}-${msg.prompt.slice(0, 20)}`}>
                        <Typography variant='subtitle1' gutterBottom>
                            {msg.prompt}
                        </Typography>
                        <Stack direction='row' spacing={2} flexWrap='wrap'>
                            {msg.images.map((img, i) => {
                                // Determine the image source based on type
                                const imageSrc =
                                    img.type === 'url'
                                        ? `${process.env.NEXT_PUBLIC_FLOWISE_DOMAIN || 'http://localhost:4000'}${img.data}`
                                        : `data:image/png;base64,${img.data}`

                                return (
                                    <Box
                                        key={`image-${msg.prompt.slice(0, 10)}-${i}`}
                                        component='img'
                                        src={imageSrc}
                                        alt={`Generated image ${i + 1}`}
                                        sx={{ maxWidth: 256, borderRadius: 1 }}
                                    />
                                )
                            })}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Stack>
    )
}

export default ImageCreator
