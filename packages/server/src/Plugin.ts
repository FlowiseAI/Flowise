import fs from 'fs'
import path from 'path'
import logger from './utils/logger'
import { hooks } from './utils/hooks'
import { NodesPoolHooks } from './NodesPool'

export async function loadPlugins() {
    await pluginManager.loadPlugins()
    return pluginManager
}

class PluginManager {
    plugins: IFlowisePlugin[] = []

    isLoaded = false

    isInitialized = false

    /**
     * Initialize the plugin manager.
     * Then call await pluginManager.loadPlugins() to load plugins.
     */
    constructor() {
        this.plugins = []
    }

    /**
     * Initialize all plugins by calling their init() method.
     */
    async initialize() {
        this.plugins.forEach((plugin) => {
            plugin.initialize()
        })
        this.isInitialized = true
    }

    getPlugins() {
        return this.plugins
    }

    /**
     * Load plugins from the plugin directory without initializing them.
     *
     * @uses process.env.PLUGIN_DIR to specify the plugin directory
     * @returns {Promise<void>}
     */
    async loadPlugins() {
        const pluginDir = process.env.PLUGIN_DIR
            ? path.join(__dirname, process.env.PLUGIN_DIR)
            : path.join(__dirname, '..', '..', '..', 'plugins')

        const pluginFolders = fs.readdirSync(pluginDir)
        logger.debug(`Loading plugins from ${pluginDir}`)

        for (const folder of pluginFolders) {
            const pluginPath = path.join(pluginDir, folder)
            const packageJsonPath = path.join(pluginPath, 'package.json')

            // Check if package.json exists
            if (!fs.existsSync(packageJsonPath)) {
                logger.error(`package.json missing for ${pluginFolders} at ${pluginPath}`)
                continue
            }

            // Load package.json
            const packageJson = require(packageJsonPath)

            // Check if package.json has main field
            if (!packageJson.main) {
                logger.error(`package.json missing main field for ${pluginFolders} at ${pluginPath}`)
                continue
            }

            // Assume main field in package.json points to the compiled plugin file
            const mainFilePath = path.join(pluginPath, packageJson.main)

            // Dynamic import
            const pluginModule = await import(mainFilePath)
            const plugin: IFlowisePlugin = new pluginModule.default()

            plugin.registerComponentNodes()
            plugin.registerCredentials()

            // Successfully loaded plugin
            plugin.isLoaded = true
            this.plugins.push(plugin)
            logger.debug(`Loaded plugin ${plugin.name} from ${pluginPath}`)
        }
        this.isLoaded = true
    }
}

export const pluginManager = new PluginManager()

export class FlowisePlugin implements IFlowisePlugin {
    name: string = 'FlowisePlugin'

    isLoaded: boolean = false

    isInitialized: boolean = false

    dirname: string | null

    nodesPath: string | null

    credentailsPath: string | null

    constructor() {}

    protected logger = logger

    /**
     * Will be called after app and plugins are loaded and initialized, just before the server starts listening.
     */
    initialize() {
        // Base init implementation
    }

    registerComponentNodes() {
        // Register (component) nodes
        if (this.nodesPath) {
            this.logger.debug(`Plugin:${this.name}: Registering (component) nodes from ${this.nodesPath}`)
            hooks.on(NodesPoolHooks.GetAdditionalNodesPath, () => this.nodesPath)
        }
    }

    registerCredentials() {
        // Register credentials nodes
        if (this.credentailsPath) {
            this.logger.debug(`Plugin:${this.name}: Registering credentials from ${this.credentailsPath}`)
            hooks.on(NodesPoolHooks.GetAdditionalCredentialsPath, () => this.credentailsPath)
        }
    }
}

// ------------------------------
// Interface definitions

// Plugin System
export interface IFlowisePlugin {
    isLoaded: boolean
    name: string
    dirname: string | null
    nodesPath: string | null
    initialize: () => void
    registerComponentNodes: () => void
    registerCredentials: () => void
}
