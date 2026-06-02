const isErrorWithMessage = (error) => {
    return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
}

const toErrorWithMessage = (maybeError) => {
    if (isErrorWithMessage(maybeError)) return maybeError

    try {
        return new Error(JSON.stringify(maybeError))
    } catch {
        // fallback in case there's an error stringifying the maybeError
        // like with circular references for example.
        return new Error(String(maybeError))
    }
}

const getAxiosErrorMessage = (error) => {
    const responseData = error?.response?.data

    if (typeof responseData === 'string') return responseData

    if (responseData && typeof responseData === 'object') {
        if (typeof responseData.message === 'string') return responseData.message
        if (typeof responseData.error === 'string') return responseData.error

        try {
            return JSON.stringify(responseData)
        } catch {
            return undefined
        }
    }

    if (error?.response?.status) {
        return `${error.response.status}${error.response.statusText ? ` ${error.response.statusText}` : ''}`
    }
}

export const getErrorMessage = (error) => {
    const axiosErrorMessage = getAxiosErrorMessage(error)
    if (axiosErrorMessage) return axiosErrorMessage

    return toErrorWithMessage(error).message
}
