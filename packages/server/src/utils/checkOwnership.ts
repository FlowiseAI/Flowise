import { IUser } from '../Interface'
import { utilValidateKey } from './validateKey'
import { Request } from 'express'

const checkOwnership = async (entryOrArray: any | Array<any>, user: IUser | undefined, req?: Request) => {
    const { id: userId, organizationId, permissions } = user || {}
    const checkEntry = async (entry?: any) => {
        // Check for API key access if request is provided
        if (req && entry) {
            try {
                const isValidApiKey = await utilValidateKey(req, entry)
                if (isValidApiKey) return true
            } catch (error) {
                // If API key validation fails, continue with regular ownership check
            }
        }

        if (permissions?.includes('org:manage')) {
            return true
        }
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
        result = (await Promise.all(entryOrArray.map(checkEntry))).every(Boolean)
    } else {
        result = await checkEntry(entryOrArray)
    }
    return result
}
export default checkOwnership
