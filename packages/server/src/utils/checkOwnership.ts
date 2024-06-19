import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
const checkOwnership = async (entryOrArray: any | Array<any>, userId?: string, organizationId?: string) => {
    console.log('checkEntry', { userId, organizationId })
    const checkEntry = (entry?: any) => {
        if (entry?.userId === userId) {
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
