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
                if (isLoading) {
                    return
                }

                if (!user) {
                    console.log('No user found, redirecting to /chat')
                    router.push('/chat')
                    return
                }

                const { data } = await clientApi.getMe()
                console.log('User data:', data)

                const defaultChatflowId = data?.user?.defaultChatflowId

                if (defaultChatflowId) {
                    try {
                        router.push(`/chat/${defaultChatflowId}`)
                    } catch (navError) {
                        console.error('Error navigating to default chatflow:', navError)
                        router.push('/chat')
                    }
                } else {
                    // If no default chatflow, redirect to general chat page
                    router.push('/chat')
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
