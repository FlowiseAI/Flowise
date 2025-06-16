// packages/ui/src/hooks/useApi.jsx
import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
import { buildUrl } from '../api'         // ← use our helper

export default (apiFunc) => {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setApiError] = useState(null)
  const { setError, handleError } = useError()

  const request = async (path, config = {}) => {
    setLoading(true)
    try {
      // builds exactly https://host.com/api/v1/whatever
      const url = buildUrl(path)
      const result = await apiFunc(url, config)

      setData(result.data)
      setError(null)
      setApiError(null)
      return result.data
    } catch (err) {
      handleError(err || 'Unexpected Error!')
      setApiError(err || 'Unexpected Error!')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, request }
}
