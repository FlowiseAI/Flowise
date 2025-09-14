import { User } from '../enterprise/database/entities/user.entity'

export function sanitizeNullBytes(obj: any): any {
    const stack = [obj]

    while (stack.length) {
        const current = stack.pop()

        if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
                const val = current[i]
                if (typeof val === 'string') {
                    // eslint-disable-next-line no-control-regex
                    current[i] = val.replace(/\u0000/g, '')
                } else if (val && typeof val === 'object') {
                    stack.push(val)
                }
            }
        } else if (current && typeof current === 'object') {
            for (const key in current) {
                if (!Object.hasOwnProperty.call(current, key)) continue
                const val = current[key]
                if (typeof val === 'string') {
                    // eslint-disable-next-line no-control-regex
                    current[key] = val.replace(/\u0000/g, '')
                } else if (val && typeof val === 'object') {
                    stack.push(val)
                }
            }
        }
    }

    return obj
}

export function sanitizeUser(user: Partial<User>) {
    delete user.credential
    delete user.tempToken
    delete user.tokenExpiry

    return user
}
