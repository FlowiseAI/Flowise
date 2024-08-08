import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'
import { prisma } from '@db/client'
import { Chat, User, Document, Message, Sidekick, AnswersFilters } from 'types'
import { trackUsageFromMessages } from './openai/usageTracking'
import { CreateChatCompletionRequest } from 'openai'
interface CompletionResponse {
    text: string
    message: Message
}
interface StreamExtra {
    user: User
    chat: Chat
    context: string
    contextDocuments: Document[]
    sidekick?: Sidekick
    prompt: string
    filters?: AnswersFilters
    completionRequest: any
}

export async function OpenAIStream(
    payload: CreateChatCompletionRequest,
    extra: StreamExtra,
    onEnd: (response: CompletionResponse) => void
) {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const { prompt, user, sidekick, chat, context, contextDocuments } = extra
    let counter = 0

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`
        },
        method: 'POST',
        body: JSON.stringify(payload)
    })

    if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error.message)
    }

    let answer = ''
    let message

    const stream = new ReadableStream({
        async start(controller) {
            message = await prisma.message.create({
                data: {
                    context,
                    contextDocuments: {
                        connect: contextDocuments.map(({ id }) => ({ id }))
                    },
                    content: '',
                    chat: { connect: { id: chat.id } },
                    sidekickJson: sidekick as any,
                    role: 'assistant'
                },
                include: {
                    contextDocuments: true
                }
            })
            controller.enqueue(
                encoder.encode(
                    JSON.stringify({
                        ...extra,
                        id: message.id,
                        contextDocuments: message.contextDocuments,
                        role: message.role
                    }) + 'JSON_END'
                )
            )

            function onParse(event: ParsedEvent | ReconnectInterval) {
                if (event.type === 'event') {
                    const data = event.data
                    if (data === '[DONE]') {
                        controller.close()
                        return
                    }
                    try {
                        const json = JSON.parse(data)
                        const text = json.choices[0].delta.content

                        if (counter < 2 && (text?.match(/\n/) || []).length) {
                            return
                        }
                        answer += text ?? ''
                        const queue = encoder.encode(text)

                        controller.enqueue(queue)
                        counter++
                    } catch (e) {
                        controller.error(e)
                    }
                }
            }

            const parser = createParser(onParse)

            for await (const chunk of res.body as any) {
                let decoded = decoder.decode(chunk)
                parser.feed(decoded)
            }

            await trackUsageFromMessages({
                method: 'createChatCompletion',
                model: payload.model,
                messageId: message.id,
                messages: [
                    ...payload.messages,
                    {
                        role: 'assistant',
                        content: answer
                    }
                ],
                user,
                request: payload
            })

            onEnd({ ...extra, text: answer, message })

            message = await prisma.message.update({
                where: { id: message.id },
                data: {
                    content: answer
                }
            })

            controller.close()
        }
    })

    return stream
}
