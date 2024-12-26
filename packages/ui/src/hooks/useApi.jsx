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
      setError(null)
      return result.data
    } catch (err) {
      setError(err || 'Unexpected Error!')
      setData(null)
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
