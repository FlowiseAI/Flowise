import { useState, useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'

import { setBaseURL } from '../store/constant'
import { Auth0Context } from '@auth0/auth0-react'

export const Auth0Setup = ({ children, apiHost, accessToken }) => {
    const { isAuth0Ready, user } = useAuth0Setup(apiHost, accessToken)

    return <Auth0Context.Provider value={{ isAuth0Ready, user }}>{children}</Auth0Context.Provider>
}

export const useAuth0Setup = (apiHost, accessToken) => {
    const { user, isLoading, isAuthenticated, error } = useUser()
    const [isAuth0Ready, setIsAuth0Ready] = useState(false)

    useEffect(() => {
        const setBaseUrlEffect = () => {
            if (process.env.CHATFLOW_DOMAIN_OVERRIDE) {
                setBaseURL(process.env.CHATFLOW_DOMAIN_OVERRIDE)
            } else if (user && user.chatflowDomain) {
                setBaseURL(user.chatflowDomain)
            } else if (apiHost) {
                setBaseURL(apiHost)
            }
        }

        setBaseUrlEffect()
    }, [apiHost, isLoading, user, isAuthenticated])

    useEffect(() => {
        const setAccessTokenEffect = async () => {
            try {
                const newToken = accessToken
                if (newToken) {
                    sessionStorage.setItem('access_token', newToken)
                    setIsAuth0Ready(true)
                } else {
                    console.error('[useAuth0Setup] Failed to set access token: Token is undefined or null')
                }
            } catch (err) {
                setIsAuth0Ready(false)
            }
        }

        setAccessTokenEffect()
        // if (isAuthenticated) {
        // } else {
        //     console.log('[useAuth0Setup] User is not authenticated, skipping access token setup')
        // }
    }, [isAuthenticated, accessToken])
    return { isAuth0Ready, user }
}
