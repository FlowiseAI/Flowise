import { IComponentNodes } from './Interface'

import path from 'path'
import { Dirent } from 'fs'
import { getNodeModulesPackagePath } from './utils'
import { promises } from 'fs'

export class NodesPool {
    componentNodes: IComponentNodes = {}

    /**
     * Initialize to get all nodes
     */
    async initialize() {
        const packagePath = getNodeModulesPackagePath('flowise-components')
        const nodesPath = path.join(packagePath, 'dist', 'nodes')
        const nodeFiles = await this.getFiles(nodesPath)
        return Promise.all(
            nodeFiles.map(async (file) => {
                if (file.endsWith('.js')) {
                    const nodeModule = await require(file)
                    try {
                        const newNodeInstance = new nodeModule.nodeClass()
                        newNodeInstance.filePath = file

                        this.componentNodes[newNodeInstance.name] = newNodeInstance

                        // Replace file icon with absolute path
                        if (
                            newNodeInstance.icon &&
                            (newNodeInstance.icon.endsWith('.svg') ||
                                newNodeInstance.icon.endsWith('.png') ||
                                newNodeInstance.icon.endsWith('.jpg'))
                        ) {
                            const filePath = file.replace(/\\/g, '/').split('/')
                            filePath.pop()
                            const nodeIconAbsolutePath = `${filePath.join('/')}/${newNodeInstance.icon}`
                            this.componentNodes[newNodeInstance.name].icon = nodeIconAbsolutePath
                        }
                    } catch (e) {
                        // console.error(e);
                    }
                }
            })
        )
    }

    /**
     * Recursive function to get node files
     * @param {string} dir
     * @returns {string[]}
     */
    async getFiles(dir: string): Promise<string[]> {
        const dirents = await promises.readdir(dir, { withFileTypes: true })
        const files = await Promise.all(
            dirents.map((dirent: Dirent) => {
                const res = path.resolve(dir, dirent.name)
                return dirent.isDirectory() ? this.getFiles(res) : res
            })
        )
        return Array.prototype.concat(...files)
    }
}
