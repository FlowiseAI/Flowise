import { useRef, useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Box, IconButton, CircularProgress } from '@mui/material'
import { IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'

const AudioWaveform = ({
    audioSrc,
    onPlay,
    onPause,
    onEnded,
    isPlaying = false,
    duration: _duration = 0,
    isGenerating = false,
    disabled = false,
    externalAudioRef = null,
    resetProgress = false
}) => {
    const canvasRef = useRef(null)
    const audioRef = useRef(null)
    const animationRef = useRef(null)
    const theme = useTheme()

    const [progress, setProgress] = useState(0)
    const [_audioBuffer, setAudioBuffer] = useState(null)
    const [waveformData, setWaveformData] = useState([])

    // Generate waveform visualization data
    const generateWaveform = useCallback((buffer) => {
        if (!buffer) return []

        const rawData = buffer.getChannelData(0)
        const samples = 200 // More bars for smoother appearance like reference
        const blockSize = Math.floor(rawData.length / samples)
        const filteredData = []

        for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i
            let sum = 0
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockStart + j])
            }
            filteredData.push(sum / blockSize)
        }

        // Normalize the data
        const maxValue = Math.max(...filteredData)
        return filteredData.map((value) => (value / maxValue) * 100)
    }, [])

    // Generate realistic placeholder waveform like in reference
    const generatePlaceholderWaveform = useCallback(() => {
        const samples = 200
        const waveform = []

        for (let i = 0; i < samples; i++) {
            // Create a more realistic waveform pattern
            const position = i / samples
            const baseHeight = 20 + Math.sin(position * Math.PI * 4) * 15
            const variation = Math.random() * 40 + 10
            const envelope = Math.sin(position * Math.PI) * 0.8 + 0.2

            waveform.push((baseHeight + variation) * envelope)
        }

        return waveform
    }, [])

    // Draw waveform on canvas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || waveformData.length === 0) return

        const ctx = canvas.getContext('2d')

        // Handle high DPI displays for crisp rendering
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'

        ctx.clearRect(0, 0, rect.width, rect.height)

        // More bars for smoother appearance like the reference
        const totalBars = waveformData.length
        const barWidth = 2 // Fixed thin bar width like in reference
        const barSpacing = 1 // Small gap between bars
        const totalWidth = rect.width
        const startX = (totalWidth - totalBars * (barWidth + barSpacing)) / 2
        const centerY = rect.height / 2

        waveformData.forEach((value, index) => {
            const barHeight = Math.max(2, (value / 100) * (rect.height * 0.8))
            const x = startX + index * (barWidth + barSpacing)

            // Determine color based on playback progress
            const progressIndex = Math.floor((progress / 100) * waveformData.length)
            const isPlayed = index <= progressIndex

            ctx.fillStyle = isPlayed ? theme.palette.primary.main : theme.palette.mode === 'dark' ? '#444' : '#ccc'

            // Draw thin vertical bars like in reference
            ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
        })
    }, [waveformData, progress, theme])

    // Load and decode audio for waveform generation
    useEffect(() => {
        if (audioSrc && audioSrc.startsWith('blob:')) {
            const loadAudioBuffer = async () => {
                try {
                    const response = await fetch(audioSrc)
                    const arrayBuffer = await response.arrayBuffer()
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
                    const buffer = await audioContext.decodeAudioData(arrayBuffer)
                    setAudioBuffer(buffer)
                    const waveform = generateWaveform(buffer)
                    setWaveformData(waveform)
                } catch (error) {
                    console.error('Error loading audio buffer:', error)
                    // Generate placeholder waveform
                    const placeholder = generatePlaceholderWaveform()
                    setWaveformData(placeholder)
                }
            }
            loadAudioBuffer()
        } else {
            // Always show placeholder waveform when no audio source
            const placeholder = generatePlaceholderWaveform()
            setWaveformData(placeholder)
        }
    }, [audioSrc, generateWaveform, generatePlaceholderWaveform])

    // Reset progress when resetProgress prop is true
    useEffect(() => {
        if (resetProgress) {
            setProgress(0)
        }
    }, [resetProgress])

    // Draw waveform when data changes or progress updates
    useEffect(() => {
        drawWaveform()
    }, [drawWaveform, progress])

    // Update progress during playback
    useEffect(() => {
        const activeAudioRef = externalAudioRef || audioRef.current
        if (isPlaying && activeAudioRef && audioSrc) {
            const updateProgress = () => {
                const audio = externalAudioRef || audioRef.current
                if (audio && audio.duration && !isNaN(audio.duration)) {
                    const currentProgress = (audio.currentTime / audio.duration) * 100
                    setProgress(currentProgress)
                }
                if (isPlaying && audio && !audio.paused) {
                    animationRef.current = requestAnimationFrame(updateProgress)
                }
            }

            // Start the update loop
            animationRef.current = requestAnimationFrame(updateProgress)
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isPlaying, audioSrc, externalAudioRef])

    const handlePlayPause = () => {
        if (isPlaying) {
            onPause?.()
        } else {
            onPlay?.()
        }
    }

    // Handle canvas click for seeking
    const handleCanvasClick = (event) => {
        const activeAudio = externalAudioRef || audioRef.current
        if (!activeAudio || !activeAudio.duration || disabled || isGenerating) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const clickX = event.clientX - rect.left

        // Use the actual canvas display width for more accurate clicking
        const clickProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
        const seekTime = (clickProgress / 100) * activeAudio.duration

        activeAudio.currentTime = seekTime
        setProgress(clickProgress)
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Hidden audio element for duration and seeking - only if no external ref */}
            {audioSrc && !externalAudioRef && (
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    onLoadedMetadata={() => {
                        if (audioRef.current) {
                            setProgress(0)
                        }
                    }}
                    onTimeUpdate={() => {
                        // Additional progress update on timeupdate event
                        const audio = audioRef.current
                        if (audio && audio.duration && !isNaN(audio.duration)) {
                            const currentProgress = (audio.currentTime / audio.duration) * 100
                            setProgress(currentProgress)
                        }
                    }}
                    onEnded={() => {
                        setProgress(0)
                        onEnded?.()
                    }}
                    style={{ display: 'none' }}
                >
                    <track kind='captions' />
                </audio>
            )}

            {/* Play button and Waveform side by side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Play/Pause Button */}
                <IconButton
                    onClick={handlePlayPause}
                    disabled={disabled || isGenerating}
                    size='small'
                    sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        backgroundColor: isPlaying ? 'transparent' : theme.palette.primary.main,
                        color: isPlaying ? theme.palette.primary.main : 'white',
                        border: isPlaying ? `1px solid ${theme.palette.primary.main}` : 'none',
                        '&:hover': {
                            backgroundColor: isPlaying ? theme.palette.primary.main : theme.palette.primary.dark,
                            color: 'white'
                        },
                        '&:disabled': {
                            backgroundColor: theme.palette.action.disabled,
                            color: theme.palette.action.disabled,
                            border: 'none'
                        }
                    }}
                >
                    {isGenerating ? (
                        <CircularProgress size={16} />
                    ) : isPlaying ? (
                        <IconPlayerPause size={16} />
                    ) : (
                        <IconPlayerPlay size={16} />
                    )}
                </IconButton>

                {/* Waveform Canvas */}
                <Box
                    sx={{
                        flex: 1,
                        cursor: !disabled && !isGenerating && audioSrc ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={400}
                        height={32}
                        onClick={handleCanvasClick}
                        style={{
                            width: '100%',
                            height: '32px',
                            backgroundColor: 'transparent',
                            opacity: disabled ? 0.6 : 1,
                            display: 'block'
                        }}
                    />
                </Box>
            </Box>
        </Box>
    )
}

AudioWaveform.propTypes = {
    audioSrc: PropTypes.string,
    onPlay: PropTypes.func,
    onPause: PropTypes.func,
    onEnded: PropTypes.func,
    isPlaying: PropTypes.bool,
    duration: PropTypes.number,
    isGenerating: PropTypes.bool,
    disabled: PropTypes.bool,
    externalAudioRef: PropTypes.object,
    resetProgress: PropTypes.bool
}

export default AudioWaveform
