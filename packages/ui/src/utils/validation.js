import { z } from 'zod/v3'

export const passwordSchema = (t) =>
    z
        .string()
        .min(8, t('common.validation.password.atLeast8'))
        .max(128, t('common.validation.password.notMoreThan128'))
        .regex(/[a-z]/, t('common.validation.password.lowercase'))
        .regex(/[A-Z]/, t('common.validation.password.uppercase'))
        .regex(/\d/, t('common.validation.password.digit'))
        .regex(/[^a-zA-Z0-9]/, t('common.validation.password.special'))

export const validatePassword = (password) => {
    const result = passwordSchema.safeParse(password)
    if (!result.success) {
        return result.error.errors.map((err) => err.message)
    }
    return []
}
