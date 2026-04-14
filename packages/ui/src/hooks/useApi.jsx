import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
// i18n
import { useTranslation } from 'react-i18next'

export default (apiFunc) => {
    const { t } = useTranslation()
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
            handleError(err || t('errors.unexpectedError'))
            setApiError(err || t('errors.unexpectedError'))
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
