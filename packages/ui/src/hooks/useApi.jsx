import { useState } from 'react'

export default (apiFunc) => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    const request = async (...args) => {
        setLoading(true)
        try {
            const result = await apiFunc(...args)
            setData(result.data)
        } catch (err) {
            if (err.response && err.response.status === 401) {
                window.location.href = '/api/auth/login?redirect_uri=' + window.location.href
            } else {
                setError(err || 'Unexpected Error!')
            }
        } finally {
            setLoading(false)
        }
    }

    return {
        data,
        error,
        loading,
        request
    }
}
