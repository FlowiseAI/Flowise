import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'

export default (apiFunc) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setApiError] = useState(null)
    const { setError, handleError } = useError()

    const request = async (...args) => {
        setLoading(true)
        try {
            const result = await apiFunc(...args)
            setData(result.data)
            setError(null)
            setApiError(null)
        } catch (err) {
            handleError(err || 'Unexpected Error!')
            setApiError(err || 'Unexpected Error!')
        } finally {
            setLoading(false)
        }
    }

    return {
        error,
        data,
        loading,
        request
    }
}
