import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
import { API_ROOT } from '../api'    // ← the helper you created

export default (apiFunc) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setApiError] = useState(null)
  const { setError, handleError } = useError()

  const request = async (path, config = {}) => {
    setLoading(true)
    try {
      // make sure we don’t end up with …/api/api/…
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      const url = `${API_ROOT}${cleanPath}`
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

  return {
    data,
    error,
    loading,
    request,
  }
}
