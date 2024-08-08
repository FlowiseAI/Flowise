import { isAxiosError } from 'axios'

const getAxiosErrorMessage = (error: unknown, messageDefault?: string): string => {
    let message: string = messageDefault ?? ''
    if (isAxiosError(error)) {
        message = error.response?.status.toString() || 'UNKNOWN HTTP ERROR'
    } else if (typeof error === 'string' || typeof error === 'number') {
        message = error.toString()
    } else if (error instanceof Error) {
        message = error.message
    } else if (error) {
        message = JSON.stringify(error)
    }
    return message
}

export default getAxiosErrorMessage
