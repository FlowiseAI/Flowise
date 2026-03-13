import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { CircularProgress, Box } from '@mui/material'
import { SET_ONBOARDING_STATUS, SET_ONBOARDING_LOADING } from '@/store/actions'
import onboardingApi from '@/api/onboarding'

// Gate component that decides whether to show onboarding
const OnboardingGate = ({ children }) => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    const { loading } = useSelector((state) => state.onboarding)

    useEffect(() => {
        const fetchOnboardingStatus = () => {
            try {
                dispatch({ type: SET_ONBOARDING_LOADING, payload: true })
                const response = onboardingApi.getStatus()
                dispatch({ type: SET_ONBOARDING_STATUS, payload: { data: response.data } })

                // Redirect to welcome if needed
                if (response.data.showWelcomePage && location.pathname !== '/welcome' && location.pathname === '/') {
                    navigate('/welcome')
                }
            } catch (error) {
                console.error('Failed to fetch onboarding status:', error)
            } finally {
                dispatch({ type: SET_ONBOARDING_LOADING, payload: false })
            }
        }

        fetchOnboardingStatus()
    }, [dispatch, navigate, location.pathname])

    if (loading) {
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh'>
                <CircularProgress />
            </Box>
        )
    }

    return <>{children}</>
}

OnboardingGate.propTypes = {
    children: PropTypes.node.isRequired
}

export default OnboardingGate
