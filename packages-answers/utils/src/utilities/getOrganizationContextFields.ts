import { Organization } from 'types'

const getOrganizationContextFields = (organization?: Organization): Record<string, any> => {
    if (!organization) return {}

    const organizationContext: Record<string, any> = (organization?.contextFields ?? []).reduce(
        (result, { fieldId, fieldTextValue }) => ({
            ...result,
            [fieldId]: fieldTextValue
        }),
        {}
    )

    organizationContext.name = organization?.name

    return organizationContext
}

export default getOrganizationContextFields
