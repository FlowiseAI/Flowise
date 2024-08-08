'use client'
import React, { useEffect, useState } from 'react'
import ChatDetailWidget from './ChatDetailWidget'
import { signIn } from 'next-auth/react'
import { Session } from '@auth0/nextjs-auth0'
import { useRouter } from 'next/navigation'

interface ChatWidgetProps {
    params: any
    session: Session
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ session, params }) => {
    const [isAuthorized, setIsAuthorized] = useState(!!session?.user)
    const Router = useRouter()

    useEffect(() => {
        if (isAuthorized) return
        const searchParams = new URLSearchParams(location.search)
        const apiKey = searchParams.get('apiKey')

        //TODO: Show error if api key is not passed in
        if (!apiKey) console.log('no api key')

        const signInAsync = async () => {
            const signInResponse = await signIn(
                'app-widget',
                {
                    apiKey,
                    redirect: false
                },
                {}
            )
            // console.log('signInResponse', signInResponse);
            setIsAuthorized(!!signInResponse?.ok)
            Router.refresh()
        }
        signInAsync()
    }, [isAuthorized, Router])

    return isAuthorized && session?.user ? (
        <ChatDetailWidget user={session.user} appSettings={session.user.appSettings} {...params} />
    ) : null
}

export default ChatWidget
