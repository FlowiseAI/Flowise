import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'
import authApi from '@/api/auth'

const SSOSuccess = () => {
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        const run = async () => {
            const queryParams = new URLSearchParams(location.search)
            const token = queryParams.get('token')

            if (token) {
                try {
                    const user = await authApi.ssoSuccess(token)
                    if (user) {
                        if (user.status === 200) {
                            store.dispatch(loginSuccess(user.data))
                            navigate('/chatflows')
                        } else {
                            navigate('/login')
                        }
                    } else {
                        navigate('/login')
                    }
                } catch (error) {
                    navigate('/login')
                }
            }
        }
        run()
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
