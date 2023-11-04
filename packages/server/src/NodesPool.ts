import { IComponentNodes, IComponentCredentials } from './Interface'
import path from 'path'
import { Dirent } from 'fs'
import { getNodeModulesPackagePath } from './utils'
import { promises } from 'fs'
import { ICommonObject } from 'flowise-components'
import { hooks } from './utils/hooks'

/**
 * Available hooks for NodesPool
 */
export enum NodesPoolHooks {
    /**
     * Action after nodes pool is initialized.
     * @param {NodesPool} nodesPool
     */
    OnInitialize = 'flowise:on-initialize-nodes-pool',

    /**
     * Allows to add an additional (components) nodes path.
     * Typically within a plugin
     * @returns {string}
     */
    GetAdditionalNodesPath = 'flowise:get-additional-nodes-path',

    /**
     * Allows to add an additional credentials path.
     * Typically within a plugin
     * @returns {string}
     */
    GetAdditionalCredentialsPath = 'flowise:get-additional-credentials-path'
}

export class NodesPool {
    componentNodes: IComponentNodes = {}
    componentCredentials: IComponentCredentials = {}
    private credentialIconPath: ICommonObject = {}

    constructor() {}

    /**
     * Initialize to get all nodes & credentials
     */
    async initialize() {
        await this.initializeNodes()
        await this.initializeCredentials()
        hooks.emit(NodesPoolHooks.OnInitialize, this)
    }

    /**
     * Initialize nodes
     */
    private async initializeNodes() {
        const packagePath = getNodeModulesPackagePath('flowise-components')
        const nodesPath = path.join(packagePath, 'dist', 'nodes')
        let nodeFiles = await this.getFiles(nodesPath)

        // Load additional nodes via hook (usually from within plugins)
        const additionalNodesPathes = await hooks.call(NodesPoolHooks.GetAdditionalNodesPath)
        for (const additionalNodesPath of additionalNodesPathes) {
            const _nodeFiles = await this.getFiles(additionalNodesPath as string)
            nodeFiles.push(..._nodeFiles)
        }

        return Promise.all(
            nodeFiles.map(async (file) => {
                if (file.endsWith('.js')) {
                    const nodeModule = await require(file)

                    if (nodeModule.nodeClass) {
                        const newNodeInstance = new nodeModule.nodeClass()
                        newNodeInstance.filePath = file

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
                            newNodeInstance.icon = nodeIconAbsolutePath

                            // Store icon path for componentCredentials
                            if (newNodeInstance.credential) {
                                for (const credName of newNodeInstance.credential.credentialNames) {
                                    this.credentialIconPath[credName] = nodeIconAbsolutePath
                                }
                            }
                        }

                        const skipCategories = ['Analytic']
                        if (!skipCategories.includes(newNodeInstance.category)) {
                            this.componentNodes[newNodeInstance.name] = newNodeInstance
                        }
                    }
                }
            })
        )
    }

    public async addNode() {}

    /**
     * Initialize credentials
     */
    private async initializeCredentials() {
        const packagePath = getNodeModulesPackagePath('flowise-components')
        const nodesPath = path.join(packagePath, 'dist', 'credentials')
        const nodeFiles = await this.getFiles(nodesPath)

        // Load additional nodes via hook (usually from within plugins)
        const additionalCredentialsPathes = await hooks.call(NodesPoolHooks.GetAdditionalCredentialsPath)
        for (const additionalCredentialsPath of additionalCredentialsPathes) {
            const _nodeFiles = await this.getFiles(additionalCredentialsPath as string)
            nodeFiles.push(..._nodeFiles)
        }

        return Promise.all(
            nodeFiles.map(async (file) => {
                if (file.endsWith('.credential.js')) {
                    const credentialModule = await require(file)
                    if (credentialModule.credClass) {
                        const newCredInstance = new credentialModule.credClass()
                        newCredInstance.icon = this.credentialIconPath[newCredInstance.name] ?? ''
                        this.componentCredentials[newCredInstance.name] = newCredInstance
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
    private async getFiles(dir: string): Promise<string[]> {
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
