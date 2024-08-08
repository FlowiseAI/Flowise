'use client'
// useStreamedResponse.ts
import { useState } from 'react'
import { Message, Sidekick } from 'types'
interface GenerateResponseArgs {
    content: string
    journeyId?: string
    chatId?: string
    messages?: any[]
    filters?: any
    sidekick?: Sidekick
    gptModel?: string
}

const parseMessages = (messages?: any[]) => messages?.map(({ role, content }) => ({ role, content }))
export const useStreamedResponse = ({
    apiUrl,
    onChunk,
    onEnd,
    onError
}: // setChat
{
    apiUrl: string
    onChunk: (chunk: Message) => void
    onEnd: (chunk: Message) => void
    onError: (err: any) => void
    // setChat: (chat: Chat) => void;
}) => {
    const [isStreaming, setIsStreaming] = useState(false)

    const [generatedResponse, setGeneratedResponse] = useState<any>({})

    const generateResponse = async ({ content, chatId, journeyId, messages, filters, sidekick, gptModel }: GenerateResponseArgs) => {
        try {
            setGeneratedResponse('')
            setIsStreaming(true)

            const response = await fetch(`${apiUrl || '/api'}/ai/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    journeyId,
                    chatId,
                    prompt: content,
                    filters,
                    messages: parseMessages(messages),
                    sidekick: sidekick, // Add sidekick parameter
                    gptModel // Add gptModel parameter
                })
            })

            if (!response.ok) {
                const body = await response.json()
                setGeneratedResponse({})
                setIsStreaming(false)

                if (body.code) {
                    return onError(body)
                } else {
                    return onError({ code: response.statusText })
                }
            }

            const data = response.body
            if (!data) {
                return
            }
            const reader = data.getReader()
            const decoder = new TextDecoder()
            let done = false
            let extra: any
            let answer = ''
            let streamedResponse = ''
            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value)
                streamedResponse = (streamedResponse || '') + chunkValue
                let [currentAnswer, jsonData] = streamedResponse.split('JSON_START')
                answer = currentAnswer
                if (!extra) {
                    if (jsonData) {
                        jsonData = jsonData?.replace('JSON_END', '')
                        try {
                            extra = JSON.parse(jsonData)
                            // if (extra.chat) setChat(extra.chat);
                        } catch (e) {
                            console.log('ParseError', e)
                        }
                    }
                    onChunk({ role: 'assistant', ...extra, content: answer })
                } else {
                    onChunk({ role: 'assistant', ...extra, content: answer })
                }
            }
            setGeneratedResponse({})
            setIsStreaming(false)
            onEnd({ role: 'assistant', content, ...extra })
        } catch (error) {
            setIsStreaming(false)
            onError(error)
        }
    }

    return { isStreaming, generatedResponse, generateResponse }
}
