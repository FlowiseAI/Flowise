import path from 'path'
import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const getVersion = async () => {
    try {
        const getPackageJsonPath = (): string => {
            const checkPaths = [
                path.join(__dirname, '..', 'package.json'),
                path.join(__dirname, '..', '..', 'package.json'),
                path.join(__dirname, '..', '..', '..', 'package.json'),
                path.join(__dirname, '..', '..', '..', '..', 'package.json'),
                path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
            ]
            for (const checkPath of checkPaths) {
                if (fs.existsSync(checkPath)) {
                    return checkPath
                }
            }
            return ''
        }
        const packagejsonPath = getPackageJsonPath()
        if (!packagejsonPath) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version not found`)
        }
        try {
            const content = await fs.promises.readFile(packagejsonPath, 'utf8')
            const parsedContent = JSON.parse(content)
            return {
                version: parsedContent.version
            }
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version not found- ${getErrorMessage(error)}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: versionService.getVersion - ${getErrorMessage(error)}`)
    }
}

export default {
    getVersion
}
