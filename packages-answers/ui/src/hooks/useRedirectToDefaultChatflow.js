'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import clientApi from '@/api/auth'

const useRedirectToDefaultChatflow = () => {
    const router = useRouter()
    const { user, isLoading } = useUser()

    useEffect(() => {
        const redirectToDefaultChatflow = async () => {
            try {
                if (isLoading || !user) {
                    return
                }

                if (window.location.pathname !== '/chat') {
                    return
                }

                const { data } = await clientApi.getMe()

                const defaultChatflowId = data?.user?.defaultChatflowId
                if (defaultChatflowId) {
                    router.push(`/chat/${defaultChatflowId}`)
                }
            } catch (error) {
                console.error('Error redirecting to default chatflow:', error)
                router.push('/chat')
            }
        }

        redirectToDefaultChatflow()
    }, [isLoading, user, router])
}

export default useRedirectToDefaultChatflow
