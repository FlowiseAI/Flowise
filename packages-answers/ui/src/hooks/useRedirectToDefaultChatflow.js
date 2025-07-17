'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import clientApi from '@/api/auth'

const useRedirectToDefaultChatflow = () => {
    const router = useRouter()
    const { user, isLoading } = useUser()
    const hasExecutedRef = useRef(false)

    useEffect(() => {
        // Prevent multiple executions
        if (hasExecutedRef.current) return

        const redirectToDefaultChatflow = async () => {
            try {
                // Wait until the user loading state is finished
                if (isLoading) {
                    return
                }

                // Mark as executed to prevent re-runs
                hasExecutedRef.current = true

                // If there is no authenticated user, redirect to the generic chat page
                if (!user) {
                    router.push('/chat')
                    return
                }

                // Fetch the current user's profile to get the default chatflow ID
                const { data } = await clientApi.getMe()
                const defaultChatflowId = data?.user?.defaultChatflowId

                if (defaultChatflowId) {
                    // If a default chatflow ID exists, redirect to that chatflow
                    router.push(`/chat/${defaultChatflowId}`)
                } else {
                    // If no default chatflow is set, redirect to the generic chat page
                    router.push('/chat')
                }
            } catch (error) {
                // On any error (API/network/etc), redirect to the generic chat page
                router.push('/chat')
            }
        }

        redirectToDefaultChatflow()
    }, [isLoading, user, router])
}

export default useRedirectToDefaultChatflow
