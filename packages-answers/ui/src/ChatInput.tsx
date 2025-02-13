'use client'
import React, { useState, useEffect, useRef, ChangeEvent } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import AttachFileIcon from '@mui/icons-material/PermMedia'
import MicIcon from '@mui/icons-material/Mic'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { IconCircleDot } from '@tabler/icons-react'

import { throttle } from '@utils/throttle'
import { useAnswers } from './AnswersContext'

import type { Sidekick, StarterPrompt } from 'types'
import { DefaultPrompts } from './DefaultPrompts'
import { FileUpload } from './AnswersContext'

const constraints = {
    isImageUploadAllowed: true,
    imgUploadSizeAndTypes: [
        { fileTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxUploadSize: 5 },
        { fileTypes: ['audio/mpeg', 'audio/wav', 'audio/webm'], maxUploadSize: 10 }
    ]
}

interface ChatInputProps {
    scrollRef?: React.RefObject<HTMLDivElement>
    isWidget?: boolean
    sidekicks?: Sidekick[]
    uploadedFiles: FileUpload[]
    setUploadedFiles: (files: FileUpload[]) => void
}

const ChatInput = ({ scrollRef, isWidget, sidekicks, uploadedFiles, setUploadedFiles }: ChatInputProps) => {
    const defaultPlaceholderValue = 'How can you help me accomplish my goal?'
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
    const { chat, journey, messages, sendMessage, isLoading, sidekick, gptModel, startNewChat, chatbotConfig } = useAnswers()
    const [isMessageStopping, setIsMessageStopping] = useState(false)
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState({})

    const throttledScroll = React.useCallback(
        throttle(() => {
            scrollRef?.current?.scrollTo({ top: scrollRef.current.scrollHeight })
        }, 300),
        [scrollRef]
    )

    useEffect(() => {
        if (messages?.length && isLoading) throttledScroll()
    }, [chat, journey, messages, scrollRef])

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

    const handleSubmit = async () => {
        if (!inputValue && uploadedFiles.length === 0 && !recordedAudio) return

        const files = uploadedFiles.map((file: FileUpload) => ({
            data: file.data,
            type: file.type,
            name: file.name,
            mime: file.mime
        }))

        if (recordedAudio) {
            const reader = new FileReader()
            reader.readAsDataURL(recordedAudio)
            reader.onload = (evt) => {
                if (!evt?.target?.result) return
                files.push({
                    data: evt.target.result as string,
                    type: 'file',
                    name: `audio_${Date.now()}.wav`,
                    mime: recordedAudio?.type
                })

                sendMessage({
                    content: inputValue,
                    chatId: chat?.id,
                    files,
                    sidekick,
                    gptModel
                })
            }
        } else {
            sendMessage({
                content: inputValue,
                chatId: chat?.id,
                files,
                sidekick,
                gptModel
            })
        }

        setInputValue('')
        setUploadedFiles([])
        setRecordedAudio(null)
        setRecordingStatus('')
        setIsLoadingRecording(false)
        setRecordingTime(0)
    }

    const isFileAllowedForUpload = (file: File) => {
        let acceptFile = false
        if (constraints.isImageUploadAllowed) {
            const fileType = file.type
            const sizeInMB = file.size / 1024 / 1024
            constraints.imgUploadSizeAndTypes.forEach((allowed) => {
                if (allowed.fileTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
                    acceptFile = true
                }
            })
        }
        if (!acceptFile) {
            alert(`Cannot upload file. Kindly check the allowed file types and maximum allowed size.`)
        }
        return acceptFile
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
        let validFiles = []
        for (const file of files) {
            if (isFileAllowedForUpload(file)) {
                const preview = await createFilePreview(file)
                validFiles.push(preview)
            }
        }
        setUploadedFiles((prevFiles) => [...prevFiles, ...validFiles])
    }

    const handleRemoveFile = (index: number) => {
        setUploadedFiles((prevFiles: FileUpload[]) => prevFiles.filter((_, i) => i !== index))
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
                let previewUrl
                if (file.type.startsWith('audio/')) {
                    previewUrl = '' // Could use audio icon like ChatMessage
                } else if (file.type.startsWith('image/')) {
                    previewUrl = URL.createObjectURL(file)
                }
                resolve({
                    data: result as string,
                    preview: previewUrl || '',
                    type: 'file',
                    name,
                    mime: file.type
                })
            }
            reader.readAsDataURL(file)
        })
    }

    const clearPreviews = () => {
        uploadedFiles.forEach((file) => URL.revokeObjectURL(file.preview))
        setUploadedFiles([])
    }

    const handleAudioRecordStart = () => {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                mediaRecorderRef.current = new MediaRecorder(stream)
                mediaRecorderRef.current.start()
                setIsRecording(true)
                setRecordingTime(0)
                setRecordingStatus('')

                mediaRecorderRef.current.ondataavailable = (event) => {
                    const audioBlob = event.data
                    const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/webm' })
                    setRecordedAudio(audioFile)
                    if (isLoadingRecording) {
                        handleSubmit()
                    }
                }

                mediaRecorderRef.current.onstop = () => {
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

    const handleAudioRecordStop = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setRecordingStatus(`Recording stopped. Duration: ${formatTime(recordingTime)}`)
        }
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
        return `${minutes}:${remainingSeconds}`
    }

    const handleKeyPress = (e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit()
            e.preventDefault()
        }
    }

    const handleAbort = async () => {
        setIsMessageStopping(true)
        try {
            // Need to implement abort functionality in AnswersContext
            await abortMessage(chat?.id)
            setIsMessageStopping(false)
        } catch (error) {
            setIsMessageStopping(false)
            // Handle error
        }
    }

    const onSourceDialogClick = (data: any, title: string) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    const handlePromptSelected = (prompt: StarterPrompt) => {
        sendMessage({ content: prompt.prompt, sidekick, gptModel })
        setInputValue('')
    }

    const handleStopAndSend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            setIsLoadingRecording(true)
            mediaRecorderRef.current.addEventListener(
                'dataavailable',
                async (event) => {
                    const audioBlob = event.data
                    const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/webm' })
                    setRecordedAudio(audioFile)
                    const reader = new FileReader()
                    reader.readAsDataURL(audioFile)
                    reader.onload = (evt) => {
                        if (!evt?.target?.result) return
                        const files = uploadedFiles.map((file: FileUpload) => ({
                            data: file.data,
                            type: file.type,
                            name: file.name,
                            mime: file.mime
                        }))
                        files.push({
                            data: evt.target.result as string,
                            type: 'file',
                            name: `audio_${Date.now()}.wav`,
                            mime: audioFile.type
                        })
                        sendMessage({
                            content: inputValue,
                            chatId: chat?.id,
                            files,
                            sidekick,
                            gptModel
                        })
                        setInputValue('')
                        setUploadedFiles([])
                        setRecordedAudio(null)
                        setRecordingStatus('')
                        setIsLoadingRecording(false)
                        setRecordingTime(0)
                    }
                },
                { once: true }
            )
            mediaRecorderRef.current.stop()
        } else if (recordedAudio) {
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
            {!messages?.length ? (
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', alignItems: 'flex-end' }}>
                    <DefaultPrompts prompts={chatbotConfig?.starterPrompts} onPromptSelected={handlePromptSelected} />
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
                        {file.mime.startsWith('image/') ? (
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
                        ) : (
                            <Box display='flex' alignItems='center'>
                                <span style={{ fontSize: '0.8em', color: '#fff' }}>{file.name}</span>
                            </Box>
                        )}
                    </Box>
                ))}
                {recordedAudio && (
                    <Box
                        sx={{
                            position: 'relative'
                        }}
                    >
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio controls src={URL.createObjectURL(recordedAudio)} />
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
                            paddingBottom: 1
                        },
                        startAdornment: (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                                <IconCircleDot sx={{ color: 'red', animation: 'pulse 1.5s infinite' }} />
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
                            paddingBottom: 2
                        },
                        startAdornment: (
                            <Tooltip title='Attach image'>
                                <IconButton component='label' sx={{ minWidth: 0 }}>
                                    <AttachFileIcon />
                                    <input type='file' accept='image/*' hidden multiple onChange={handleFileUpload} />
                                </IconButton>
                            </Tooltip>
                        ),
                        endAdornment: (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title={isRecording ? 'Stop Recording' : 'Record Audio'}>
                                    <IconButton onClick={handleAudioRecordStart}>
                                        <MicIcon />
                                    </IconButton>
                                </Tooltip>

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
