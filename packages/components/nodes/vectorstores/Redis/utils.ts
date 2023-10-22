/*
 * Escapes all '-' characters.
 * Redis Search considers '-' as a negative operator, hence we need
 * to escape it
 */
export const escapeSpecialChars = (str: string) => {
    return str.replaceAll('-', '\\-')
}

export const escapeAllStrings = (obj: object) => {
    Object.keys(obj).forEach((key: string) => {
        // @ts-ignore
        let item = obj[key]
        if (typeof item === 'object') {
            escapeAllStrings(item)
        } else if (typeof item === 'string') {
            // @ts-ignore
            obj[key] = escapeSpecialChars(item)
        }
    })
}

export const unEscapeSpecialChars = (str: string) => {
    return str.replaceAll('\\-', '-')
}
