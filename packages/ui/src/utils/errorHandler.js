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

export const getErrorMessage = (error) => {
    return toErrorWithMessage(error).message
}
