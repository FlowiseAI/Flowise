type ThrottledFunction<T extends any[]> = (...args: T) => void

export function throttle<T extends any[]>(func: ThrottledFunction<T>, delay: number): ThrottledFunction<T> {
    let isThrottled = false
    let lastArgs: T | null = null

    const throttledFunction: ThrottledFunction<T> = (...args: T) => {
        if (isThrottled) {
            lastArgs = args
            return
        }

        func(...args)
        isThrottled = true

        setTimeout(() => {
            isThrottled = false
            if (lastArgs) {
                throttledFunction(...lastArgs)
                lastArgs = null
            }
        }, delay)
    }

    return throttledFunction
}
