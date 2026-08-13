import { isNil } from 'lodash'

/*
 * Escapes all RediSearch special characters.
 * RediSearch reserves the following characters as operators/delimiters,
 * so they must be escaped when stored as metadata values:
 *   , . < > { } [ ] " ' : ; ! @ # $ % ^ & * ( ) - + = ~ \
 */
export const escapeSpecialChars = (str: string) => {
    return str.replace(/([,.<>{}[\]"':;!@#$%^&*()\-+=~\\])/g, '\\$1')
}

export const escapeAllStrings = (obj: object) => {
    if (isNil(obj)) {
        // return if obj is null or undefined to avoid "TypeError: Cannot convert undefined or null to object"
        return
    }
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
    return str.replace(/\\([,.<>{}[\]"':;!@#$%^&*()\-+=~\\])/g, '$1')
}
