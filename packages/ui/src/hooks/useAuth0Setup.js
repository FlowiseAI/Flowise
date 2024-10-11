import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { setBaseURL } from '../store/constant'
export const useAuth0Setup = (apiHost) => {
    const { user, getAccessTokenSilently, isLoading, loginWithRedirect, isAuthenticated, error } = useAuth0()
    const [isAuth0Ready, setIsAuth0Ready] = useState(false)

    useEffect(() => {
        const setBaseUrlEffect = () => {
            if (user && user.chatflowDomain) {
                console.log('[useAuth0Setup] Setting baseURL with user.chatflowDomain:', user.chatflowDomain)
                setBaseURL(user.chatflowDomain)
            } else if (apiHost) {
                console.log('[useAuth0Setup] Setting baseURL with apiHost:', apiHost)
                setBaseURL(apiHost)
            }
        }

        setBaseUrlEffect()
    }, [apiHost, isLoading, user, isAuthenticated])

    useEffect(() => {
        const setAccessTokenEffect = async () => {
            try {
                const newToken = await getAccessTokenSilently()
                if (newToken) {
                    sessionStorage.setItem('access_token', newToken)
                    setIsAuth0Ready(true)
                    console.log('[useAuth0Setup] Access token set successfully')
                } else {
                    console.error('[useAuth0Setup] Failed to set access token: Token is undefined or null')
                }
            } catch (err) {
                console.error('[useAuth0Setup] Error setting access token:', err)
                setIsAuth0Ready(false)
            }
        }

        setAccessTokenEffect()
        // if (isAuthenticated) {
        // } else {
        //     console.log('[useAuth0Setup] User is not authenticated, skipping access token setup')
        // }
    }, [isAuthenticated, getAccessTokenSilently])
    console.log('[useAuth0Setup] isAuth0Ready', isAuth0Ready)
    console.log('[useAuth0Setup] user', user)
    console.log('[useAuth0Setup] error', error)
    return { isAuth0Ready, user }
}
