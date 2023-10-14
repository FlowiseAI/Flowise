export const buildMetadataTerms = (filter?: object): { term: Record<string, unknown> }[] => {
    if (filter == null) return []
    const result = []
    for (const [key, value] of Object.entries(filter)) {
        result.push({ term: { [`metadata.${key}`]: value } })
    }
    return result
}
