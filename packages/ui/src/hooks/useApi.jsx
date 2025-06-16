import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
import { buildUrl } from '../api'

export default (apiFunc) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setApiError] = useState(null)
    const { setError, handleError } = useError()

    const request = async (pathOrArgs, config = {}) => {
        setLoading(true)
        const cfg = { withCredentials: true, ...config }
        try {
            let result

            if (typeof pathOrArgs === 'string') {
                const url = buildUrl(pathOrArgs)
                result = await apiFunc(url, cfg)
            } else {
                result = await apiFunc(pathOrArgs, cfg)
            }

            setData(result.data)
            setError(null)
            setApiError(null)
            return result.data
        } catch (err) {
            const safeErr = err || new Error('Unexpected Error!')
            if (!safeErr.response) safeErr.response = {}
            handleError(safeErr)
            setApiError(safeErr)
            throw safeErr
        } finally {
            setLoading(false)
        }
    }

    return { data, error, loading, request }
}
