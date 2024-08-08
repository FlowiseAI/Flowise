'use client'
export function clearEmptyValues(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.filter((value) => value !== null && value !== undefined && value !== '')
    }

    const result: any = {}

    for (const key in obj) {
        const value = obj[key]

        if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object') {
                const cleanedValue = clearEmptyValues(value)

                if (Object.keys(cleanedValue).length > 0) {
                    result[key] = cleanedValue
                }
            } else {
                result[key] = value
            }
        }
    }

    if (Object.keys(result).length === 0) {
        return {}
    }

    return result
}
