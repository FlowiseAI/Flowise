/* eslint-disable solid/reactivity */
type BotProps = {
    chatflowid: string
    apiHost?: string
}

export const init = (props: BotProps) => {
    const element = document.createElement('flowise-chatbot')
    Object.assign(element, props)
    document.body.appendChild(element)
}

type Chatbot = {
    init: typeof init
}

declare const window:
    | {
          Chatbot: Chatbot | undefined
      }
    | undefined

export const parseChatbot = () => ({
    init
})

export const injectChatbotInWindow = (bot: Chatbot) => {
    if (typeof window === 'undefined') return
    window.Chatbot = { ...bot }
}
