type DebounceFn<T extends (...args: any[]) => any> = (this: ThisParameterType<T>, ...args: Parameters<T>) => ReturnType<T>

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options?: { leading?: boolean; trailing?: boolean }
): DebounceFn<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let lastArgs: Parameters<T> | undefined
    let lastThis: ThisParameterType<T> | undefined
    let result: ReturnType<T> | undefined

    const clear = () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = undefined
        }
    }

    const invoke = (time: number) => {
        clear()
        result = func.apply(lastThis!, lastArgs!)
        lastArgs = lastThis = undefined
    }

    const debounced: DebounceFn<T> = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        lastArgs = args
        lastThis = this

        if (!timeoutId && options?.leading !== false) {
            result = func.apply(this, args)
        }

        clear()

        timeoutId = setTimeout(() => {
            if (options?.trailing !== false) {
                invoke(Date.now())
            }
        }, wait)

        return result!
    }

    // debounced.cancel = clear;

    return debounced
}
