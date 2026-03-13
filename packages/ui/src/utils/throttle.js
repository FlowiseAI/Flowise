/**
 * Creates a throttled function that only invokes the provided function at most once per every wait milliseconds
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} The throttled function
 */
export const throttle = (func, wait) => {
    let timeout = null
    let previous = 0

    return function (...args) {
        const context = this
        const now = Date.now()
        const remaining = wait - (now - previous)

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout)
                timeout = null
            }
            previous = now
            func.apply(context, args)
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now()
                timeout = null
                func.apply(context, args)
            }, remaining)
        }
    }
}
