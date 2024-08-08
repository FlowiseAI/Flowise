import { useState } from 'react'
import { AppSettings } from 'types'

const saveAppSettings = async (data: AppSettings): Promise<AppSettings> => {
    const response = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    const savedData = await response.json()
    return savedData
}

const useAppSettings = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
        setIsLoading(true)
        setError(null)
        try {
            const savedSettings = await saveAppSettings(newSettings)
            setIsLoading(false)
            return savedSettings
        } catch (err: any) {
            setError(err)
            setIsLoading(false)
        }
    }

    return { updateAppSettings, isLoading, error }
}

export default useAppSettings
