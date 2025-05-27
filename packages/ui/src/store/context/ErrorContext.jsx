import { createContext, useContext, useState } from 'react'
import { redirectWhenUnauthorized } from '@/utils/genericHelper'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { store } from '@/store'
import { logoutSuccess } from '@/store/reducers/authSlice'
import { ErrorMessage } from '../constant'

const ErrorContext = createContext()

export const ErrorProvider = ({ children }) => {
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleError = async (err) => {
        console.error(err)
        if (err?.response?.status === 403) {
            navigate('/unauthorized')
        } else if (err?.response?.status === 401) {
            if (ErrorMessage.INVALID_MISSING_TOKEN === err?.response?.data?.message) {
                store.dispatch(logoutSuccess())
                navigate('/login')
            } else {
                const isRedirect = err?.response?.data?.redirectTo && err?.response?.data?.error

                if (isRedirect) {
                    redirectWhenUnauthorized({
                        error: err.response.data.error,
                        redirectTo: err.response.data.redirectTo
                    })
                } else {
                    const currentPath = window.location.pathname
                    if (currentPath !== '/signin' && currentPath !== '/login') {
                        store.dispatch(logoutSuccess())
                        navigate('/login')
                    }
                }
            }
        } else setError(err)
    }

    return (
        <ErrorContext.Provider
            value={{
                error,
                setError,
                handleError
            }}
        >
            {children}
        </ErrorContext.Provider>
    )
}

export const useError = () => useContext(ErrorContext)

ErrorProvider.propTypes = {
    children: PropTypes.any
}
