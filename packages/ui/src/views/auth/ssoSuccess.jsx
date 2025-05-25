import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'

const SSOSuccess = () => {
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        // Parse the "user" query parameter from the URL
        const queryParams = new URLSearchParams(location.search)
        const userData = queryParams.get('user')

        if (userData) {
            // Decode the user data and save it to the state
            try {
                const parsedUser = JSON.parse(decodeURIComponent(userData))
                store.dispatch(loginSuccess(parsedUser))
                navigate('/chatflows')
            } catch (error) {
                console.error('Failed to parse user data:', error)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search])

    return (
        <div>
            <h1>Loading dashboard...</h1>
            <p>Loading data...</p>
        </div>
    )
}

export default SSOSuccess
