import { useEffect, useRef } from 'react'
import 'octobot-embed-chat'

export const FullPageChat = (props) => {
    const ref = useRef(null)

    useEffect(() => {
        if (ref.current) {
            Object.assign(ref.current, props)
        }
    }, [props])

    return <octobot-fullchatbot ref={ref}></octobot-fullchatbot>
}

export const BubbleChat = (props) => {
    const ref = useRef(null)

    useEffect(() => {
        if (ref.current) {
            Object.assign(ref.current, props)
        }
    }, [props])

    return <octobot-chatbot ref={ref}></octobot-chatbot>
}
