import { ICommonObject, IFileUpload } from './Interface'
import { getCredentialData } from './utils'
import { type ClientOptions, OpenAIClient, toFile } from '@langchain/openai'
import { AssemblyAI } from 'assemblyai'
import { getFileFromStorage } from './storageUtils'
import axios from 'axios'
import Groq from 'groq-sdk'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import {
    TranscribeClient,
    StartTranscriptionJobCommand,
    GetTranscriptionJobCommand,
    TranscriptionJobStatus,
    MediaFormat,
    DeleteTranscriptionJobCommand
} from '@aws-sdk/client-transcribe'

const SpeechToTextType = {
    OPENAI_WHISPER: 'openAIWhisper',
    ASSEMBLYAI_TRANSCRIBE: 'assemblyAiTranscribe',
    LOCALAI_STT: 'localAISTT',
    AZURE_COGNITIVE: 'azureCognitive',
    GROQ_WHISPER: 'groqWhisper',
    AWS_TRANSCRIBE: 'awsTranscribe'
}

export const convertSpeechToText = async (upload: IFileUpload, speechToTextConfig: ICommonObject, options: ICommonObject) => {
    if (speechToTextConfig) {
        const credentialId = speechToTextConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const audio_file = await getFileFromStorage(upload.name, options.orgId, options.chatflowid, options.chatId)

        switch (speechToTextConfig.name) {
            case SpeechToTextType.OPENAI_WHISPER: {
                const openAIClientOptions: ClientOptions = {
                    apiKey: credentialData.openAIApiKey
                }
                const openAIClient = new OpenAIClient(openAIClientOptions)
                const file = await toFile(audio_file, upload.name)
                const openAITranscription = await openAIClient.audio.transcriptions.create({
                    file: file,
                    model: 'whisper-1',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig?.prompt
                })
                if (openAITranscription?.text) {
                    return openAITranscription.text
                }
                break
            }
            case SpeechToTextType.ASSEMBLYAI_TRANSCRIBE: {
                const assemblyAIClient = new AssemblyAI({
                    apiKey: credentialData.assemblyAIApiKey
                })

                const params = {
                    audio: audio_file,
                    speaker_labels: false
                }

                const assemblyAITranscription = await assemblyAIClient.transcripts.transcribe(params)
                if (assemblyAITranscription?.text) {
                    return assemblyAITranscription.text
                }
                break
            }
            case SpeechToTextType.LOCALAI_STT: {
                const LocalAIClientOptions: ClientOptions = {
                    apiKey: credentialData.localAIApiKey,
                    baseURL: speechToTextConfig?.baseUrl
                }
                const localAIClient = new OpenAIClient(LocalAIClientOptions)
                const file = await toFile(audio_file, upload.name)
                const localAITranscription = await localAIClient.audio.transcriptions.create({
                    file: file,
                    model: speechToTextConfig?.model || 'whisper-1',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig?.prompt
                })
                if (localAITranscription?.text) {
                    return localAITranscription.text
                }
                break
            }
            case SpeechToTextType.AZURE_COGNITIVE: {
                try {
                    const baseUrl = `https://${credentialData.serviceRegion}.cognitiveservices.azure.com/speechtotext/transcriptions:transcribe`
                    const apiVersion = credentialData.apiVersion || '2024-05-15-preview'

                    const formData = new FormData()
                    const audioBlob = new Blob([new Uint8Array(audio_file)], { type: upload.type })
                    formData.append('audio', audioBlob, upload.name)

                    const channelsStr = speechToTextConfig.channels || '0,1'
                    const channels = channelsStr.split(',').map(Number)

                    const definition = {
                        locales: [speechToTextConfig.language || 'en-US'],
                        profanityFilterMode: speechToTextConfig.profanityFilterMode || 'Masked',
                        channels
                    }
                    formData.append('definition', JSON.stringify(definition))

                    const response = await axios.post(`${baseUrl}?api-version=${apiVersion}`, formData, {
                        headers: {
                            'Ocp-Apim-Subscription-Key': credentialData.azureSubscriptionKey,
                            Accept: 'application/json'
                        }
                    })

                    if (response.data && response.data.combinedPhrases.length > 0) {
                        return response.data.combinedPhrases[0]?.text || ''
                    }
                    return ''
                } catch (error) {
                    throw error.response?.data || error
                }
            }
            case SpeechToTextType.GROQ_WHISPER: {
                const groqClient = new Groq({
                    apiKey: credentialData.groqApiKey
                })
                const file = await toFile(audio_file, upload.name)
                const groqTranscription = await groqClient.audio.transcriptions.create({
                    file,
                    model: speechToTextConfig?.model || 'whisper-large-v3',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    response_format: 'verbose_json'
                })
                if (groqTranscription?.text) {
                    return groqTranscription.text
                }
                break
            }
            case SpeechToTextType.AWS_TRANSCRIBE: {
                const region = speechToTextConfig.region || 'us-east-1'
                const s3BucketName = speechToTextConfig.s3BucketName as string
                const languageCode = speechToTextConfig.languageCode || 'en-US'

                if (!s3BucketName) {
                    throw new Error('S3 Bucket Name is required for AWS Transcribe')
                }

                const awsClientConfig: Record<string, any> = { region }
                if (credentialData.awsKey && credentialData.awsSecret) {
                    awsClientConfig.credentials = {
                        accessKeyId: credentialData.awsKey,
                        secretAccessKey: credentialData.awsSecret,
                        ...(credentialData.awsSession && { sessionToken: credentialData.awsSession })
                    }
                }

                const s3Client = new S3Client(awsClientConfig)
                const transcribeClient = new TranscribeClient(awsClientConfig)

                // Generate unique file name and upload to S3
                const fileExtension = ((upload.name || '').split('.').pop() || 'webm').toLowerCase()
                const s3Key = 'flowise-stt-temp/' + Date.now() + '-' + Math.random().toString(36).substring(2) + '.' + fileExtension
                const jobName = 'flowise-' + Date.now() + '-' + Math.random().toString(36).substring(2)

                try {
                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: s3BucketName,
                            Key: s3Key,
                            Body: Buffer.from(audio_file),
                            ContentType: upload.mime || 'audio/webm'
                        })
                    )

                    // Determine media format from file extension
                    const mediaFormatMap: Record<string, string> = {
                        webm: 'webm',
                        mp3: 'mp3',
                        mp4: 'mp4',
                        wav: 'wav',
                        flac: 'flac',
                        ogg: 'ogg',
                        amr: 'amr'
                    }
                    const mediaFormat = (mediaFormatMap[fileExtension] || 'webm') as MediaFormat

                    // Start transcription job
                    await transcribeClient.send(
                        new StartTranscriptionJobCommand({
                            TranscriptionJobName: jobName,
                            LanguageCode: languageCode,
                            Media: {
                                MediaFileUri: `s3://${s3BucketName}/${s3Key}`
                            },
                            MediaFormat: mediaFormat
                        })
                    )

                    // Poll for completion with 60 second timeout
                    const POLL_INTERVAL_MS = 3000
                    const TIMEOUT_MS = 60000
                    const startTime = Date.now()

                    let transcriptText = ''
                    let jobCompleted = false

                    while (!jobCompleted) {
                        if (Date.now() - startTime > TIMEOUT_MS) {
                            throw new Error('AWS Transcribe job timed out after 60 seconds')
                        }

                        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

                        const jobResult = await transcribeClient.send(
                            new GetTranscriptionJobCommand({
                                TranscriptionJobName: jobName
                            })
                        )

                        const status = jobResult.TranscriptionJob?.TranscriptionJobStatus

                        if (status === TranscriptionJobStatus.COMPLETED) {
                            const transcriptUri = jobResult.TranscriptionJob?.Transcript?.TranscriptFileUri
                            if (transcriptUri) {
                                const transcriptResponse = await axios.get(transcriptUri)
                                const transcriptData = transcriptResponse.data
                                transcriptText = transcriptData?.results?.transcripts?.[0]?.transcript || ''
                            }
                            jobCompleted = true
                        } else if (status === TranscriptionJobStatus.FAILED) {
                            const failureReason = jobResult.TranscriptionJob?.FailureReason || 'Unknown error'
                            throw new Error(`AWS Transcribe job failed: ${failureReason}`)
                        }
                        // IN_PROGRESS or QUEUED — continue polling
                    }

                    // Clean up: delete temporary S3 file and Transcribe job
                    try {
                        await s3Client.send(
                            new DeleteObjectCommand({
                                Bucket: s3BucketName,
                                Key: s3Key
                            })
                        )
                    } catch {
                        // Non-fatal: log but don't fail if cleanup fails
                    }

                    try {
                        await transcribeClient.send(
                            new DeleteTranscriptionJobCommand({
                                TranscriptionJobName: jobName
                            })
                        )
                    } catch {
                        // Non-fatal
                    }

                    if (transcriptText) {
                        return transcriptText
                    }
                } catch (error) {
                    // Attempt cleanup on error too
                    try {
                        await s3Client.send(
                            new DeleteObjectCommand({
                                Bucket: s3BucketName,
                                Key: s3Key
                            })
                        )
                    } catch {
                        // Non-fatal cleanup error
                    }

                    try {
                        await transcribeClient.send(
                            new DeleteTranscriptionJobCommand({
                                TranscriptionJobName: jobName
                            })
                        )
                    } catch {
                        // Non-fatal cleanup error
                    }
                    throw error
                }
                break
            }
        }
    } else {
        throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
    }
    return undefined
}
