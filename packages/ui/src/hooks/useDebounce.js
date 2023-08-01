import { useEffect, useState } from 'react'

/**
 * useDebounce is a custom hook that delays the update of a value.
 *
 * @param {string} value - The value to be debounced.
 * @param {number} delay - The delay time in milliseconds as a number.
 * @returns {*} The debounced value.
 * @example 
 *  export default function Component() {
    const [value, setValue] = useState('')
    const debouncedValue = useDebounce(value, 500)

    const handleChange = (event) => {
        setValue(event.target.value)
    }

    // Fetch API (optional)
    useEffect(() => {
        // Do fetch here...
        // Triggers when "debouncedValue" changes
    }, [debouncedValue])

    return (
        <div>
            <p>Value real-time: {value}</p>
            <p>Debounced value: {debouncedValue}</p>

            <input type='text' value={value} onChange={handleChange} />
        </div>
    )
}
 */

export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}
