import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
import { buildUrl } from '../api'   // our helper

export default (apiFunc) => {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setApiError] = useState(null)
  const { setError, handleError } = useError()

  const request = async (pathOrArgs, config = {}) => {
    setLoading(true)
    try {
      let result

      if (typeof pathOrArgs === 'string') {
        // you passed a relative path: build the full URL
        const url = buildUrl(pathOrArgs)
        result = await apiFunc(url, config)
      } else {
        // you passed some other signature (e.g. auto-gen apiFunc that already knows its path)
        result = await apiFunc(pathOrArgs, config)
      }

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
