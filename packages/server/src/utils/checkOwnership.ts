const checkOwnership = async (entryOrArray: any | Array<any>, userId?: string, organizationId?: string) => {
    console.log('checkOwnership', { entryOrArray, userId, organizationId })
    const checkEntry = (entry?: any) => {
        if (entry?.isPublic || entry?.userId === userId) {
            return true
        }
        if (entry?.visibility && entry?.visibility?.includes('Organization')) {
            if (organizationId && entry?.organizationId === organizationId) {
                return true
            }
        }
        return false
        // throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
    }
    let result = false
    if (Array.isArray(entryOrArray)) {
        result = entryOrArray.every(checkEntry)
    } else {
        result = checkEntry(entryOrArray)
    }
    return result
}
export default checkOwnership
