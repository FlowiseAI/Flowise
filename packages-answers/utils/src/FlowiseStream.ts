import { Sidekick } from 'db/generated/prisma-client'
import socketIOClient from 'socket.io-client'
import { Chat } from 'types'
export const getFlowisePredictionStream = async ({
    // chat,
    sidekick,
    body,
    accessToken,
    onEnd
}: {
    chat?: Chat
    sidekick: Sidekick
    body: any
    accessToken: string
    onEnd: (extra: any) => any
}) => {
    let answer = ''
    // let message;
    const encoder = new TextEncoder()
    let extra: any = {
        // chat,
        role: 'assistant'
    }
    const stream = new ReadableStream({
        async start(controller) {
            // TODO: Figure out a better way to do this
            if (process.env.NODE_ENV === 'development')
                // @ts-ignore
                sidekick.chatflowDomain = sidekick.chatflowDomain?.replace('8080', '4000')

            const socket = socketIOClient(sidekick.chatflowDomain!) //flowise url

            socket.on('error', (err) => {
                console.log('SocketIO->error', err)
            })

            socket.on('token', (token) => {
                try {
                    controller.enqueue(encoder.encode(token))
                } catch (err) {
                    console.log('ErrorSendingToken', err)
                }
            })

            // socket.on('sourceDocuments', (sourceDocuments) => {
            //   console.log('SocketIO->sourceDocuments:', sourceDocuments?.length);
            // });

            // socket.on('end', () => {
            //   console.log('SocketIO->end');
            // });

            socket.on('connect', async () => {
                try {
                    const chatflowChat = await query({
                        sidekick,
                        accessToken,
                        socketIOClientId: socket.id!,
                        body
                    })

                    extra = {
                        ...extra,
                        ...chatflowChat,
                        contextDocuments: chatflowChat?.sourceDocuments
                    }
                    if (onEnd) {
                        const endResult = await onEnd(extra)
                        extra = { ...extra, ...endResult }
                    }
                } catch (error: any) {
                    // Report error when hitting Flowise
                    extra = {
                        ...extra,
                        error: { code: 'FlowiseError', message: error.message?.replace('Error: ', '') }
                    }
                    console.log('FlowisePredictionError->OnEnd', error)
                }
                if (extra.error) {
                    console.error('[Error][Flowise]', extra.error.message)
                }
                controller.enqueue(encoder.encode('JSON_START' + JSON.stringify(extra) + 'JSON_END'))
                controller.close()
                socket.disconnect()
            })
        }
    })
    return stream
}
async function query({
    sidekick,
    body,
    accessToken,
    socketIOClientId
}: {
    sidekick: Sidekick
    body: any
    accessToken: string
    socketIOClientId: string
}) {
    const { chatflow, chatflowDomain } = sidekick
    console.log('FetchFlowise', `${chatflowDomain}/api/v1/prediction/${chatflow?.id}`)
    const response = await fetch(`${chatflowDomain}/api/v1/prediction/${chatflow?.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ ...body, socketIOClientId })
    })
    if (response.ok) {
        const result = await response.json()
        return result
    } else {
        const result = await response.text()
        throw new Error(result)
    }
}
