import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
const checkOwnership = async (entryOrArray: any | Array<any>, userId?: string, organizationId?: string) => {
    const checkEntry = (entry?: any) => {
        if (entry?.userId === userId) {
            return true
        }
        if (organizationId && entry?.organizationId === organizationId) {
            return true
        }
        return false
        // throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
    }

    if (Array.isArray(entryOrArray)) {
        entryOrArray.forEach(checkEntry)
    } else {
        checkEntry(entryOrArray)
    }
    return true
}
export default checkOwnership
