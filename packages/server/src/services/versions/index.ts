import path from 'path'
import * as fs from 'fs'

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
            return {
                executionError: true,
                status: 404,
                msg: 'Version not found'
            }
        }
        try {
            const content = await fs.promises.readFile(packagejsonPath, 'utf8')
            const parsedContent = JSON.parse(content)
            return {
                version: parsedContent.version
            }
        } catch (error) {
            return {
                executionError: true,
                status: 500,
                msg: `Version not found: ${error}`
            }
        }
    } catch (error) {
        throw new Error(`Error: versionService.getVersion - ${error}`)
    }
}

export default {
    getVersion
}
