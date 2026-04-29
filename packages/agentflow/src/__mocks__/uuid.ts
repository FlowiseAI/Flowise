let _counter = 0

export const v4 = (): string => `test-uuid-${++_counter}`

export const reset = (): void => {
    _counter = 0
}
