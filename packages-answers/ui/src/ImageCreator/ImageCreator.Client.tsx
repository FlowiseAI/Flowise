'use client'
import { useState } from 'react'
import { Stack, TextField, Typography, Button, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material'
import type { User } from 'types'

interface Message {
    prompt: string
    images: string[]
}

const ImageCreator = ({ user }: { user: User }) => {
    const [prompt, setPrompt] = useState('')
    const [n, setN] = useState(1)
    const [size, setSize] = useState('1024x1024')
    const [quality, setQuality] = useState('auto')
    const [format, setFormat] = useState('png')
    const [background, setBackground] = useState('auto')
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)

    const generate = async () => {
        if (!prompt) return
        setLoading(true)
        try {
            const res = await fetch('/api/images/generate', {
                method: 'POST',
                body: JSON.stringify({
                    prompt,
                    n,
                    size,
                    quality,
                    format,
                    background,
                    response_format: 'b64_json'
                })
            })
            const data = await res.json()
            const imgs = data.data?.map((d: any) => d.b64_json || d.url) || []
            setMessages((prev) => [...prev, { prompt, images: imgs }])
            setPrompt('')
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Stack spacing={3} sx={{ p: 2 }}>
            <Typography variant='h2' component='h1'>
                Image Creation
            </Typography>
            <TextField label='Prompt' value={prompt} onChange={(e) => setPrompt(e.target.value)} multiline minRows={3} fullWidth />
            <Stack direction='row' spacing={2}>
                <FormControl>
                    <InputLabel id='n-label'>Images</InputLabel>
                    <Select labelId='n-label' value={n} label='Images' onChange={(e) => setN(Number(e.target.value))}>
                        {[1, 2, 3, 4].map((v) => (
                            <MenuItem key={v} value={v}>
                                {v}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl>
                    <InputLabel id='size-label'>Size</InputLabel>
                    <Select labelId='size-label' value={size} label='Size' onChange={(e) => setSize(e.target.value)}>
                        <MenuItem value='1024x1024'>1024x1024</MenuItem>
                        <MenuItem value='1536x1024'>1536x1024</MenuItem>
                        <MenuItem value='1024x1536'>1024x1536</MenuItem>
                        <MenuItem value='auto'>Auto</MenuItem>
                    </Select>
                </FormControl>
                <FormControl>
                    <InputLabel id='quality-label'>Quality</InputLabel>
                    <Select labelId='quality-label' value={quality} label='Quality' onChange={(e) => setQuality(e.target.value)}>
                        <MenuItem value='auto'>Auto</MenuItem>
                        <MenuItem value='low'>Low</MenuItem>
                        <MenuItem value='medium'>Medium</MenuItem>
                        <MenuItem value='high'>High</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
            <Stack direction='row' spacing={2}>
                <FormControl>
                    <InputLabel id='format-label'>Format</InputLabel>
                    <Select labelId='format-label' value={format} label='Format' onChange={(e) => setFormat(e.target.value)}>
                        <MenuItem value='png'>PNG</MenuItem>
                        <MenuItem value='jpeg'>JPEG</MenuItem>
                        <MenuItem value='webp'>WebP</MenuItem>
                    </Select>
                </FormControl>
                <FormControl>
                    <InputLabel id='background-label'>Background</InputLabel>
                    <Select
                        labelId='background-label'
                        value={background}
                        label='Background'
                        onChange={(e) => setBackground(e.target.value)}
                    >
                        <MenuItem value='auto'>Auto</MenuItem>
                        <MenuItem value='transparent'>Transparent</MenuItem>
                        <MenuItem value='white'>White</MenuItem>
                    </Select>
                </FormControl>
            </Stack>
            <Button variant='contained' onClick={generate} disabled={loading}>
                Generate
            </Button>
            <Stack spacing={4}>
                {messages.map((msg, idx) => (
                    <Box key={idx}>
                        <Typography variant='subtitle1' gutterBottom>
                            {msg.prompt}
                        </Typography>
                        <Stack direction='row' spacing={2} flexWrap='wrap'>
                            {msg.images.map((img, i) => (
                                <Box
                                    key={i}
                                    component='img'
                                    src={`data:image/png;base64,${img}`}
                                    alt={`img-${i}`}
                                    sx={{ maxWidth: 256, borderRadius: 1 }}
                                />
                            ))}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Stack>
    )
}

export default ImageCreator
