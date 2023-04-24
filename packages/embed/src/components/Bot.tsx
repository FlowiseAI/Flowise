import { createSignal, createEffect, For } from 'solid-js'
import { sendMessageQuery } from '@/queries/sendMessageQuery'
import { TextInput } from './inputs/textInput'

type messageType = 'apiMessage' | 'userMessage' | 'usermessagewaiting'

export type MessageType = {
    message: string
    type: messageType
}

export type BotProps = {
    chatflowid: string
    apiHost?: string
}

export const Bot = (props: BotProps) => {
    let ps: HTMLDivElement | undefined

    const [userInput, setUserInput] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [messages, setMessages] = createSignal<MessageType[]>([
        {
            message: 'Hi there! How can I help?',
            type: 'apiMessage'
        }
    ])

    const scrollToBottom = () => {
        setTimeout(() => {
            ps?.scrollTo(0, ps.scrollHeight)
        }, 50)
        /*if (ps.current) {
          const curr: any = ps.current
          curr.scrollTo({ top: 1000000, behavior: 'smooth' })
        }*/
    }

    // Handle errors
    const handleError = (message = 'Oops! There seems to be an error. Please try again.') => {
        setMessages((prevMessages) => [...prevMessages, { message, type: 'apiMessage' }])
        setLoading(false)
        setUserInput('')
    }

    // Handle form submission
    const handleSubmit = async (value: string) => {
        setUserInput(value)

        if (value.trim() === '') {
            return
        }

        setLoading(true)
        setMessages((prevMessages) => [...prevMessages, { message: value, type: 'userMessage' }])

        // Send user question and history to API
        const { data, error } = await sendMessageQuery({
            chatflowid: props.chatflowid,
            apiHost: props.apiHost,
            body: {
                question: value,
                history: messages().filter((msg) => msg.message !== 'Hi there! How can I help?')
            }
        })

        console.log(data)

        if (data) {
            setMessages((prevMessages) => [...prevMessages, { message: data, type: 'apiMessage' }])
            setLoading(false)
            setUserInput('')
            setTimeout(() => {
                scrollToBottom()
            }, 100)
        }
        if (error) {
            console.error(error)
            const err: any = error
            const errorData = err.response.data || `${err.response.status}: ${err.response.statusText}`
            handleError(errorData)
            return
        }
    }

    // Auto scroll chat to bottom
    createEffect(() => {
        scrollToBottom()
    })

    createEffect(() => {
        return () => {
            setUserInput('')
            setLoading(false)
            setMessages([
                {
                    message: 'Hi there! How can I help?',
                    type: 'apiMessage'
                }
            ])
        }
    })

    return (
        <>
            <div class='cloud'>
                <div ref={ps} class='messagelist'>
                    <For each={messages()}>
                        {(message, index) => (
                            // The latest message sent by the user will be animated while waiting for a response
                            <div
                                style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    background: message.type === 'apiMessage' ? '#f7f8ff' : ''
                                }}
                                class={
                                    message.type === 'userMessage' && loading() && index() === messages().length - 1
                                        ? 'usermessagewaiting-light'
                                        : message.type === 'usermessagewaiting'
                                        ? 'apimessage'
                                        : 'usermessage'
                                }
                            >
                                {/* Display the correct icon depending on the message type */}
                                {message.type === 'apiMessage' ? (
                                    <img
                                        src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                                        alt='AI'
                                        width='30'
                                        height='30'
                                        class='boticon'
                                    />
                                ) : (
                                    <img
                                        src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                                        alt='Me'
                                        width='30'
                                        height='30'
                                        class='usericon'
                                    />
                                )}
                                <div class='markdownanswer'>
                                    {/* Messages are being rendered in Markdown format */}
                                    <span style={{ 'font-family': 'Poppins, sans-serif' }}>{message.message}</span>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
            <TextInput defaultValue={userInput()} onSubmit={handleSubmit} />
        </>
    )
}
