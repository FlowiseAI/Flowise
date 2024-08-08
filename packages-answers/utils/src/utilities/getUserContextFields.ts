import { User } from 'types'

const getUserContextFields = (user?: User): Record<string, any> => {
    if (!user) return {}

    const userContext: Record<string, any> = (user?.contextFields ?? []).reduce(
        (result, { fieldId, fieldTextValue }) => ({
            ...result,
            [fieldId]: fieldTextValue
        }),
        {}
    )

    // Add relative user fields that should be available in the context
    userContext.name = user?.name
    userContext.role = user?.role
    userContext.email = user?.email

    return userContext
}

export default getUserContextFields
