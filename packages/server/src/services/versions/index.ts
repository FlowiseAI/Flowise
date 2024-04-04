import path from 'path'
import * as fs from 'fs'
import { ApiError } from '../../errors/apiError'
import { StatusCodes } from 'http-status-codes'

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
            throw new ApiError(StatusCodes.NOT_FOUND, `Version not found`)
        }
        try {
            const content = await fs.promises.readFile(packagejsonPath, 'utf8')
            const parsedContent = JSON.parse(content)
            return {
                version: parsedContent.version
            }
        } catch (error) {
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Version not found: ${error}`)
        }
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: versionService.getVersion - ${error}`)
    }
}

export default {
    getVersion
}
