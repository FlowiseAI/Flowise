type DebounceFn<T extends (...args: any[]) => any> = (this: ThisParameterType<T>, ...args: Parameters<T>) => void

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options?: { leading?: boolean; trailing?: boolean }
): DebounceFn<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let lastArgs: Parameters<T> | undefined
    let lastThis: ThisParameterType<T> | undefined
    let isInvokePending = false

    const clear = () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = undefined
        }
    }

    const invoke = () => {
        clear()
        func.apply(lastThis!, lastArgs!)
        lastArgs = lastThis = undefined
        isInvokePending = false
    }

    const debounced: DebounceFn<T> = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        lastArgs = args
        lastThis = this

        // If leading is true and this is the first call, execute immediately
        if (!timeoutId && options?.leading === true && !isInvokePending) {
            isInvokePending = true
            func.apply(this, args)
            return
        }

        // Clear any existing timeout
        clear()

        // Set isInvokePending to true to indicate an invocation is queued
        isInvokePending = true

        // Set a new timeout
        timeoutId = setTimeout(() => {
            if (options?.trailing !== false) {
                invoke()
            } else {
                isInvokePending = false
            }
        }, wait)
    }

    // Add cancel method
    Object.defineProperty(debounced, 'cancel', {
        value: () => {
            clear()
            isInvokePending = false
            lastArgs = lastThis = undefined
        }
    })

    return debounced
}
