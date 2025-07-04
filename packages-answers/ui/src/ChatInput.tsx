'use client'
import React, { useState, useEffect, useRef, ChangeEvent } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import AttachFileIcon from '@mui/icons-material/PermMedia'
import MicIcon from '@mui/icons-material/Mic'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { IconCircleDot } from '@tabler/icons-react'

import { useAnswers } from './AnswersContext'

import type { Sidekick, StarterPrompt } from 'types'

import dynamic from 'next/dynamic'
import { FileUpload } from './types'
const DefaultPrompts = dynamic(() => import('./DefaultPrompts').then((mod) => mod.DefaultPrompts))
const Tooltip = dynamic(() => import('@mui/material/Tooltip'))
const TextField = dynamic(() => import('@mui/material/TextField'))

interface ChatInputProps {
    scrollRef?: React.RefObject<HTMLDivElement>
    isWidget?: boolean
    sidekicks?: Sidekick[]
    uploadedFiles: FileUpload[]
    setUploadedFiles: React.Dispatch<React.SetStateAction<FileUpload[]>>
}

const ChatInput = ({ uploadedFiles, setUploadedFiles }: ChatInputProps) => {
    const [inputValue, setInputValue] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [recordingStatus, setRecordingStatus] = useState('')
    const [recordedAudio, setRecordedAudio] = useState<File | null>(null)
    const [recordingTime, setRecordingTime] = useState(0)
    const [isLoadingRecording, setIsLoadingRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordingIntervalRef = useRef<number | undefined>(undefined)
    const { messages, sendMessage, isLoading, sidekick, gptModel, chatbotConfig, handleAbort } = useAnswers()
    const constraints = sidekick?.constraints
    const [isMessageStopping, setIsMessageStopping] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const recordedAudioUrl = React.useMemo(() => {
        if (!recordedAudio) return ''
        return URL.createObjectURL(recordedAudio)
    }, [recordedAudio])

    useEffect(() => {
        return () => {
            if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl)
            }
        }
    }, [recordedAudioUrl])

    useEffect(() => {
        if (isRecording) {
            recordingIntervalRef.current = window.setInterval(() => {
                setRecordingTime((time) => time + 1)
            }, 1000)
        } else {
            clearInterval(recordingIntervalRef.current)
        }

        return () => {
            clearInterval(recordingIntervalRef.current)
        }
    }, [isRecording])

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value)
    }

    const convertAudioFileToFileUpload = (file: File): Promise<FileUpload> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)

            reader.onload = (evt) => {
                if (!evt?.target?.result) {
                    console.warn('[convertAudioFileToFileUpload] FileReader result is empty')
                    return
                }

                const audioUrl = URL.createObjectURL(file)
                const audio = new Audio(audioUrl)

                const finalize = (duration: number) => {
                    URL.revokeObjectURL(audioUrl)
                    resolve({
                        data: evt.target?.result as string,
                        preview: '',
                        type: 'audio',
                        name: file.name,
                        mime: file.type,
                        duration
                    })
                }

                audio.addEventListener('loadedmetadata', () => {
                    if (audio.duration === Infinity) {
                        console.warn('[convertAudioFileToFileUpload] Duration is Infinity. Seeking to trigger timeupdate...')
                        audio.currentTime = 1e10

                        audio.addEventListener('timeupdate', function onTimeUpdate() {
                            audio.removeEventListener('timeupdate', onTimeUpdate)
                            finalize(audio.duration)
                        })
                    } else {
                        finalize(audio.duration)
                    }
                })

                audio.addEventListener('error', (e) => {
                    console.error('[convertAudioFileToFileUpload] Audio failed to load:', e)
                    URL.revokeObjectURL(audioUrl)
                })
            }

            reader.onerror = (e) => {
                console.error('[convertAudioFileToFileUpload] FileReader error:', e)
            }
        })
    }

    const handleSubmit = async () => {
        if (!inputValue && !!uploadedFiles?.length && !recordedAudio) return

        const fileUploads: FileUpload[] = [...uploadedFiles]

        if (recordedAudio) {
            const audioUpload = await convertAudioFileToFileUpload(recordedAudio)
            audioUpload.isQuestion = true
            fileUploads.push(audioUpload)
        }

        sendMessage({
            content: inputValue,
            files: fileUploads,
            sidekick,
            gptModel
        })

        // Clear all states *after* message is sent
        setInputValue('')
        setUploadedFiles([])
        setRecordedAudio(null)
        setRecordingStatus('')
        setIsLoadingRecording(false)
        setRecordingTime(0)
    }

    const isFileAllowedForUpload = (file: File) => {
        const fileType = file.type
        const sizeInMB = file.size / 1024 / 1024
        let isAllowed = false
        let error = ''
        const isImageType = fileType.startsWith('image/')
        const isAudioType = fileType.startsWith('audio/')
        if (isAudioType && constraints?.isSpeechToTextEnabled) {
            if (sizeInMB > 25) {
                error = `Audio file too large (max 25MB): ${file.name}`
            } else {
                let found = false
                constraints?.uploadSizeAndTypes?.forEach((allowed) => {
                    if (allowed.fileTypes.includes(fileType)) {
                        found = true
                    }
                })
                if (!found) {
                    error = `Audio file type not supported: ${file.name}`
                } else {
                    isAllowed = true
                }
            }
        } else if (isImageType && constraints?.isImageUploadAllowed) {
            let found = false
            constraints?.uploadSizeAndTypes?.forEach((allowed) => {
                if (allowed.fileTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
                    found = true
                } else if (allowed.fileTypes.includes(fileType) && sizeInMB > allowed.maxUploadSize) {
                    error = `Image file too large (max ${allowed.maxUploadSize}MB): ${file.name}`
                }
            })
            if (!found && !error) {
                error = `Image file type not supported: ${file.name}`
            } else if (found) {
                isAllowed = true
            }
        } else {
            error = `File type not supported: ${file.name}`
        }
        if (!isAllowed && error) {
            setErrorMessage(error)
        }
        return isAllowed
    }

    const getAcceptedFileTypes = () => {
        const acceptedTypes: string[] = []
        if (constraints?.isImageUploadAllowed) {
            acceptedTypes.push('image/*')
        }
        if (constraints?.isSpeechToTextEnabled) {
            acceptedTypes.push('audio/*')
        }
        return acceptedTypes.join(',')
    }

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
        await processFiles(files)
        event.target.value = ''
    }

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)

        const files: File[] = []

        if (event.dataTransfer.files.length > 0) {
            files.push(...Array.from(event.dataTransfer.files))
        }

        if (event.dataTransfer.items) {
            Array.from(event.dataTransfer.items).forEach((item) => {
                if (item.kind === 'string' && item.type.match('^text/uri-list')) {
                    item.getAsString((s: string) => {
                        const upload: FileUpload = {
                            data: s,
                            preview: s,
                            type: 'url',
                            name: s ? s.substring(s.lastIndexOf('/') + 1) : ''
                        }
                        setUploadedFiles((prevFiles) => [...prevFiles, upload])
                    })
                } else if (item.kind === 'string' && item.type.match('^text/html')) {
                    item.getAsString((s: string) => {
                        if (s.indexOf('href') === -1) return
                        const start = s ? s.substring(s.indexOf('href') + 6) : ''
                        const hrefStr = start.substring(0, start.indexOf('"'))
                        const upload: FileUpload = {
                            data: hrefStr,
                            preview: hrefStr,
                            type: 'url',
                            name: hrefStr ? hrefStr.substring(hrefStr.lastIndexOf('/') + 1) : ''
                        }
                        setUploadedFiles((prevFiles) => [...prevFiles, upload])
                    })
                }
            })
        }

        if (files.length > 0) {
            await processFiles(files)
        }
    }

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const processFiles = async (files: FileList | File[]) => {
        setErrorMessage(null)
        const allFileUploads: FileUpload[] = []
        for (const file of Array.from(files)) {
            if (isFileAllowedForUpload(file)) {
                const upload = await createFilePreview(file)
                allFileUploads.push(upload)
            }
        }
        if (allFileUploads.length > 0) {
            setUploadedFiles((prevFiles) => [...prevFiles, ...allFileUploads])
        }
    }

    const handleRemoveFile = (index: number) => {
        setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
    }

    const handleRemoveAudio = () => {
        setRecordedAudio(null)
        setRecordingTime(0)
    }

    const createFilePreview = (file: File): Promise<FileUpload> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            const { name } = file

            reader.onload = (evt) => {
                if (!evt?.target?.result) return
                const { result } = evt.target

                const base: Omit<FileUpload, 'preview'> = {
                    data: result as string,
                    type: 'file',
                    name,
                    mime: file.type
                }

                if (file.type.startsWith('audio/')) {
                    const audioUrl = URL.createObjectURL(file)
                    const audio = new Audio(audioUrl)

                    audio.addEventListener('loadedmetadata', () => {
                        const finalize = (duration: number) => {
                            URL.revokeObjectURL(audioUrl)
                            const audioPreviewSvg = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5 3 19 12 5 21 5 3" fill="%230099FF" />
</svg>`
                            resolve({
                                ...base,
                                preview: audioPreviewSvg,
                                duration
                            })
                        }

                        if (audio.duration === Infinity) {
                            const onDurationChange = () => {
                                audio.removeEventListener('durationchange', onDurationChange)
                                finalize(audio.duration)
                            }
                            audio.addEventListener('durationchange', onDurationChange)
                        } else {
                            finalize(audio.duration)
                        }
                    })
                } else if (file.type.startsWith('image/')) {
                    const imagePreviewUrl = URL.createObjectURL(file)
                    resolve({
                        ...base,
                        preview: imagePreviewUrl
                    })
                } else {
                    // For non-audio/image files (e.g., PDF, docx)
                    resolve({ ...base, preview: '' })
                }
            }

            reader.readAsDataURL(file)
        })
    }

    const handleAudioRecordStart = () => {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                mediaRecorderRef.current = new MediaRecorder(stream)
                mediaRecorderRef.current.start()

                // [handleAudioRecordStart] Recording started
                setIsRecording(true)
                setRecordingTime(0)
                setRecordingStatus('')

                mediaRecorderRef.current.ondataavailable = async (event) => {
                    // [ondataavailable] Event received

                    const audioBlob = event.data
                    const audioFile = new File([audioBlob], `${Date.now()}.webm`, { type: 'audio/webm' })

                    if (isLoadingRecording) {
                        // [ondataavailable] isLoadingRecording = true. Sending message...'
                        const audioUpload = await convertAudioFileToFileUpload(audioFile)

                        sendMessage({
                            content: inputValue,
                            files: [...uploadedFiles, audioUpload],
                            sidekick,
                            gptModel
                        })

                        // Reset state
                        setInputValue('')
                        setUploadedFiles([])
                        setRecordedAudio(null)
                        setRecordingStatus('')
                        setIsLoadingRecording(false)
                        setRecordingTime(0)
                    } else {
                        // [ondataavailable] Storing recorded audio for later
                        setRecordedAudio(audioFile)
                    }
                }

                mediaRecorderRef.current.onstop = () => {
                    // [onstop] Recording stopped
                    setIsRecording(false)
                    stream.getTracks().forEach((track) => track.stop())
                }
            })
            .catch((error) => {
                console.error('Error accessing microphone:', error)
                setRecordingStatus('To record audio, use modern browsers like Chrome or Firefox that support audio recording.')
                setIsRecording(true)
            })
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
        return `${minutes}:${remainingSeconds}`
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit()
            e.preventDefault()
        }
    }

    const handleAbortMessage = async () => {
        setIsMessageStopping(true)
        try {
            await handleAbort()
            setIsMessageStopping(false)
        } catch (error) {
            setIsMessageStopping(false)
            console.error('Error stopping message:', error)
        }
    }

    const handlePromptSelected = (prompt: StarterPrompt) => {
        sendMessage({ content: prompt.prompt, sidekick, gptModel })
        setInputValue('')
    }

    const handleStopAndSend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            setIsLoadingRecording(true) // important: triggers the submit once recording finishes
            mediaRecorderRef.current.stop()
        } else if (recordedAudio) {
            // fallback: user recorded, then hit Send manually
            handleSubmit()
        }
    }

    const handleStopAndCancel = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        }
        setRecordingStatus('')
        setRecordingTime(0)
        setIsRecording(false)
        setRecordedAudio(null)
        setIsLoadingRecording(false)
    }

    return (
        <Box
            display='flex'
            position='relative'
            sx={{ gap: 1, flexDirection: 'column', pb: 2 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {errorMessage && <Box sx={{ color: 'red', mb: 1, fontWeight: 500 }}>{errorMessage}</Box>}

            {/* Add a stop button when message is loading */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 2 }}>
                    <Button variant='outlined' color='secondary' onClick={handleAbortMessage} disabled={isMessageStopping}>
                        {isMessageStopping ? 'Stopping...' : 'Stop Generating'}
                    </Button>
                </Box>
            )}

            {!messages?.length ? (
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', alignItems: 'flex-end' }}>
                    <DefaultPrompts
                        prompts={chatbotConfig?.starterPrompts}
                        onPromptSelected={handlePromptSelected}
                        handleChange={() => {}}
                    />
                </Box>
            ) : null}

            {isDragging && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        border: '2px dashed #aaa',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}
                >
                    <p>Drop files here</p>
                </Box>
            )}

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 1,
                    overflowX: 'auto',
                    padding: 0,
                    maxHeight: '80px',
                    alignItems: 'center'
                }}
            >
                {uploadedFiles.map((file, index) => (
                    <Box
                        key={index}
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                            borderRadius: 2,
                            maxWidth: '80px'
                        }}
                    >
                        <IconButton
                            onClick={() => handleRemoveFile(index)}
                            size='small'
                            sx={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                color: '#fff',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }
                            }}
                        >
                            <CloseIcon fontSize='small' style={{ fontSize: '0.75rem' }} />
                        </IconButton>
                        {file.mime && file.mime.startsWith('image/') && file.preview ? (
                            <img
                                src={file.preview}
                                alt={file.name}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'contain',
                                    borderRadius: 8,
                                    backgroundColor: '#fff'
                                }}
                            />
                        ) : file.mime && file.mime.startsWith('audio/') && file.preview ? (
                            <Box
                                sx={{
                                    width: '60px',
                                    height: '60px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#fff',
                                    borderRadius: 2,
                                    overflow: 'hidden'
                                }}
                            >
                                {file.preview.startsWith('data:image') ? (
                                    <img src={file.preview} alt='Audio icon' style={{ width: '24px', height: '24px' }} />
                                ) : (
                                    <audio controls preload='metadata' src={file.preview} style={{ width: '100%' }}>
                                        <track kind='captions' />
                                    </audio>
                                )}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    width: '60px',
                                    height: '60px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#666',
                                    borderRadius: 2,
                                    padding: 1
                                }}
                            >
                                <span style={{ fontSize: '0.65em', color: '#fff', textAlign: 'center' }}>{file.name}</span>
                            </Box>
                        )}
                    </Box>
                ))}
                {recordedAudioUrl && (
                    <Box
                        sx={{
                            position: 'relative'
                        }}
                    >
                        <audio controls preload='metadata' src={recordedAudioUrl}>
                            <track kind='captions' />
                        </audio>
                        <IconButton
                            onClick={handleRemoveAudio}
                            size='small'
                            sx={{
                                position: 'absolute',
                                bottom: 45,
                                right: -7,
                                color: '#fff',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }
                            }}
                        >
                            <CloseIcon fontSize='small' style={{ fontSize: '0.75rem' }} />
                        </IconButton>
                    </Box>
                )}
            </Box>

            {isRecording ? (
                <TextField
                    id='user-chat-input'
                    inputRef={inputRef}
                    variant='filled'
                    fullWidth
                    disabled
                    value={
                        recordingStatus === 'To record audio, use modern browsers like Chrome or Firefox that support audio recording.'
                            ? recordingStatus
                            : `Recording: ${formatTime(recordingTime)}${isLoadingRecording ? ' • Sending...' : ''}`
                    }
                    InputProps={{
                        sx: {
                            gap: 1,
                            display: 'flex',
                            paddingBottom: 1,
                            maxHeight: '30vh',
                            overflowY: 'auto',
                            textarea: {
                                maxHeight: '30vh',
                                overflowY: 'auto!important'
                            }
                        },
                        startAdornment: (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                                <IconCircleDot style={{ color: 'red', animation: 'pulse 1.5s infinite' }} />
                            </Box>
                        ),
                        endAdornment: (
                            <>
                                <Tooltip title='Cancel Recording'>
                                    <Button onClick={handleStopAndCancel}>
                                        <CloseIcon />
                                    </Button>
                                </Tooltip>

                                <Button variant='contained' color='primary' onClick={handleStopAndSend}>
                                    Send
                                </Button>
                            </>
                        )
                    }}
                />
            ) : (
                <TextField
                    id='user-chat-input'
                    inputRef={inputRef}
                    variant='filled'
                    fullWidth
                    placeholder={chatbotConfig?.textInput?.placeholder ?? 'Send a question or task'}
                    value={inputValue}
                    multiline
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    InputProps={{
                        sx: {
                            gap: 1,
                            display: 'flex',
                            paddingBottom: 2,
                            textarea: {
                                maxHeight: '30vh',
                                overflowY: 'auto!important'
                            }
                        },
                        startAdornment: (constraints?.isImageUploadAllowed || constraints?.isSpeechToTextEnabled) && (
                            <Tooltip title='Attach file'>
                                <IconButton component='label' sx={{ minWidth: 0 }}>
                                    <AttachFileIcon />
                                    <input type='file' accept={getAcceptedFileTypes()} hidden multiple onChange={handleFileUpload} />
                                </IconButton>
                            </Tooltip>
                        ),
                        endAdornment: (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {constraints?.isSpeechToTextEnabled && (
                                    <Tooltip title={isRecording ? 'Stop Recording' : 'Record Audio'}>
                                        <IconButton onClick={handleAudioRecordStart}>
                                            <MicIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Button variant='contained' color='primary' onClick={handleSubmit}>
                                    Send
                                </Button>
                            </Box>
                        )
                    }}
                />
            )}
        </Box>
    )
}

export default ChatInput
