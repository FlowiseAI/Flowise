/*
Author: Timothy Carambat from Mintplex Labs
*/

const { execSync, spawnSync, spawn } = require('child_process')
const Docker = require('dockerode')
const os = require('os')
const path = require('path')
const fs = require('fs')
const { request } = require('node:http')
const { EventEmitter } = require('stream')

const WLS_CONTAINER_NAME = 'NVIDIA-Workbench'
const WLS_CONTAINER_SERVICE_PORT = 11444
process.env.LLM_PROVIDER = 'nvidia-nim'
process.env.NVIDIA_NIM_LLM_MODE = 'managed'

/**
 * @class NimContainerManager
 * @description Manages the container runtime for NVIDIA NIM via interfaceing with the podman API
 * but is suitable for Docker as well with minor modifications. Current target is podman 5.3.1.
 */
class NimContainerManager {
    /** @type {import("dockerode")|null}*/
    client
    localNimCache
    ngcApiKey
    pullImageEmitter = new EventEmitter()
    wslContainerService = {
        ip: null,
        apiVersion: null,
        port: null
    }

    /** @type {NimContainerManager|null} */
    static _instance = null
    constructor() {
        if (NimContainerManager._instance) return NimContainerManager._instance
        NimContainerManager._instance = this
    }

    /**
     * Preloads the container manager client if the runtime is valid
     * and docker/podman is available on the current machine AND the LLM is set to use Nvidia NIM
     * @returns {Promise<NimContainerManager|null>}
     */
    static async preload() {
        if (process.env.LLM_PROVIDER === 'nvidia-nim' && process.env.NVIDIA_NIM_LLM_MODE === 'managed') {
            NimContainerManager.#slog(
                "Preloading container manager client for Nvidia NIM since it is the user's LLM provider & managed mode is enabled."
            )
            await NimContainerManager.setupContainerManager()
            if (!NimContainerManager.getWSLWorkbenchContainer()) {
                NimContainerManager.#slog('NIM Workbench wsl container not found - reverting to remote mode.')
                process.env.NVIDIA_NIM_LLM_MODE = 'remote'
            }
        }
    }

    /**
     * Unloads the container manager client if the runtime is valid
     * and docker/podman is available on the current machine
     * This is a general cleanup method for when the user is switching
     * between managed and remote modes.
     * @param {boolean} precheck - Whether to check the environment variables before unloading.
     */
    static unload(precheck = true) {
        if (precheck) {
            if (process.env.LLM_PROVIDER !== 'nvidia-nim') return
            if (process.env.NVIDIA_NIM_LLM_MODE !== 'managed') return
        }

        NimContainerManager.#slog(
            "Unloading container manager client for Nvidia NIM since it is the user's LLM provider & managed mode is enabled."
        )
        if (!NimContainerManager.getWSLWorkbenchContainer()) return
        spawn('wsl', ['-d', WLS_CONTAINER_NAME, '--', 'podman', 'stop', '--all'])
    }

    /**
     * Sets up the container manager client if the runtime is valid
     * and docker/podman is available on the current machine
     * @returns {Promise<NimContainerManager|null>}
     */
    static async setupContainerManager() {
        const manager = new NimContainerManager()
        if (!NimContainerManager.validRuntime() || !(await NimContainerManager.containerRuntimeIsAvailable())) {
            manager.client = null
            return null
        }

        const wslContainerService = NimContainerManager.bootWSLContainerService()
        manager.client = new Docker({
            host: wslContainerService.ip,
            protocol: 'http',
            port: wslContainerService.port
        })
        manager.wslContainerService = wslContainerService
        manager.setEnvs()
        return manager
    }

    /**
     * Static log method
     * @param {string} text
     * @param {...any} args
     */
    static #slog(text, ...args) {
        console.log(`\x1b[35m[NimContainerManager]\x1b[0m ${text}`, ...args)
    }

    /**
     * Detects if the current runtime is valid for using container manager
     * @returns {boolean}
     */
    static validRuntime() {
        if (process.platform !== 'win32') {
            this.#slog('NIM container management is not supported on this platform - only Windows is supported at this time.')
            return false
        }
        return true
    }

    /**
     * Gets the WSL Workbench container if it exists
     * @returns {{name: string, state: string, version: string}|null}
     */
    static getWSLWorkbenchContainer() {
        const { stdout } = spawnSync('wsl', ['--list', '--verbose'], {
            encoding: 'utf16le',
            stdout: 'pipe'
        })

        const lines = stdout
            .toString()
            .split('\n')
            .filter((line) => line.trim()) // Remove empty lines
            .slice(1) // Remove header line

        const wslContainers = lines.map((line) => {
            const [name, state, version] = line.startsWith('*') ? line.replace('*', '').trim().split(/\s+/) : line.trim().split(/\s+/)
            return {
                name: name.replace('*', '').trim(), // Remove * from default distribution
                state: state?.trim(),
                version: version?.trim()
            }
        })
        return wslContainers.find((container) => container.name === WLS_CONTAINER_NAME)
    }

    /**
     * Boots the WSL container service if it is not already running
     * @returns {{ip: string, apiVersion: string, port: number}|null}
     */
    static bootWSLContainerService() {
        NimContainerManager.#slog('Booting WSL container service...')
        const version = spawnSync('wsl', ['-d', WLS_CONTAINER_NAME, '--', 'podman', 'version'], {
            encoding: 'utf8',
            stdio: 'pipe'
        })
            .stdout.toString()
            .split('\n')
            .find((line) => line.includes('API Version'))
            .split(':')
            .pop()
            .trim()

        // Kill the existing podman service if it is running
        spawnSync('wsl', ['-d', WLS_CONTAINER_NAME, '--', 'kill', '-9', `$(lsof -t -i:${WLS_CONTAINER_SERVICE_PORT})`])

        // Start the podman service - if the port is already in use, it will fail
        // but it is ignored as the container will still start and the podman service will be alive.
        NimContainerManager.#slog(
            'Starting podman API service in NVIDIA-Workbench WSL container. Check /home/workbench/podman-service.log in the container for podman API logs.'
        )
        spawn('wsl', [
            '-d',
            WLS_CONTAINER_NAME,
            '--',
            'podman',
            'system',
            'service',
            '--time=0',
            `tcp://0.0.0.0:${WLS_CONTAINER_SERVICE_PORT}`,
            '&>',
            '/home/workbench/podman-service.log'
        ])

        const wslContainerIp = spawnSync(
            'wsl',
            [
                '-d',
                WLS_CONTAINER_NAME,
                '--',
                'bash',
                '-c',
                "ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | sed 's/inet //'"
            ],
            {
                encoding: 'utf8',
                stdout: 'pipe'
            }
        )
            .stdout.toString()
            .trim()

        NimContainerManager.#slog(
            `WSL container service booted successfully. Podman API(v${version}) is available at: ${wslContainerIp}:${WLS_CONTAINER_SERVICE_PORT}`
        )
        return {
            ip: wslContainerIp,
            apiVersion: version,
            port: WLS_CONTAINER_SERVICE_PORT
        }
    }

    /**
     * Checks if container runtime is available on the current machine
     * and we can interact with it
     * @returns {Promise<boolean>}
     */
    static async containerRuntimeIsAvailable() {
        try {
            if (!NimContainerManager.validRuntime()) return false
            const workbenchContainer = NimContainerManager.getWSLWorkbenchContainer()
            if (!workbenchContainer) throw new Error(`${WLS_CONTAINER_NAME} container not found`)

            if (workbenchContainer.state !== 'Running') {
                this.#slog(`${WLS_CONTAINER_NAME} container is not running, starting it now...`)
                spawnSync('wsl', ['-d', WLS_CONTAINER_NAME, '--', 'pwd'])
            }
            this.#slog(`${WLS_CONTAINER_NAME} container is running, continuing...`)

            const wslContainerService = NimContainerManager.bootWSLContainerService()
            const client = new Docker({
                host: wslContainerService.ip,
                protocol: 'http',
                port: wslContainerService.port
            })
            const info = await client.info()
            return !!info
        } catch (err) {
            this.#slog('Container runtime is not available on this client, is not running, or is invalid.', err.message)
            return false
        }
    }

    /**
     * Converts some common container runtime errors into more readable messages
     * @param {string} error - The error message to clean up.
     * @returns {string} - The cleaned up error message.
     */
    static readableError(error) {
        if (error.includes('port is already allocated'))
            return 'Port for this container is already allocated by another container. You should fully stop other containers using the same port before starting this one.'
        if (error.includes('"message": "Access Denied"'))
            return 'You do not have permission to access this image. Make sure the tag is correct and you have authenticated with your NGC API key.'
        return error
    }

    /**
     * Pauses or starts a container.
     * @param {string} containerId - The ID of the container to toggle.
     * @param {('pause'|'unpause'|'stop'|'start'|'remove')} action - The action to perform on the container.
     * @returns {Promise<boolean>} - A promise that resolves to true if the container was toggled successfully, false otherwise.
     */
    static async toggleContainer(containerId, action = 'stop') {
        const manager = new NimContainerManager()
        if (!manager.client) throw new Error('Container runtime client not available')

        const container = manager.client.getContainer(containerId)
        if (!container) throw new Error('Container not found')
        const containerState = await container.inspect().then((info) => info.State)

        if (action === 'pause') {
            // Already paused or not running - nothing to do
            if (containerState.Paused || !containerState.Running) return true
            manager.#log('Pausing Running container', containerId)
            await container.pause()
            return true
        }

        if (action === 'stop') {
            if (!containerState.Running) return true
            manager.#log('Stopping Running container', containerId)
            await container.stop()
            return true
        }

        if (action === 'start') {
            if (containerState.Running) return true
            manager.#log('Starting Stopped container', containerId)
            await container.start()
            return true
        }

        if (action === 'remove') {
            manager.#log('Removing container', containerId)
            await container.remove({ force: true })
            return true
        }

        if (action === 'unpause') {
            if (containerState.Paused) {
                manager.#log('Unpausing Paused container', containerId)
                await container.unpause()
                return true
            }

            if (!containerState.Running) {
                manager.#log('Container was paused but not running - starting it now', containerId)
                await container.start()
                return true
            }
        }

        throw new Error('Invalid action')
    }

    /**
     * Makes a request to the podman API directly without using the Dockerode client
     * There are some incompatibilities between the Dockerode client and the podman API
     * and sometimes we need to make requests to the podman API directly to get around
     * these issues. This method allows us to do both.
     * @param {string} path - The path to request.
     * @param {string} method - The method to use for the request.
     * @param {any} body - The body to send with the request.
     * @returns {Promise<any>} - A promise that resolves to the response from the request.
     */
    async podmanRequest(path, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.wslContainerService.ip,
                port: this.wslContainerService.port,
                path: `/v${this.wslContainerService.apiVersion}${path}`,
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            }

            const req = request(options, (res) => {
                let data = ''
                res.on('data', (chunk) => {
                    data += chunk
                })
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data))
                    } catch (e) {
                        resolve(data)
                    }
                })
            })

            req.on('error', reject)

            if (body) {
                req.write(JSON.stringify(body))
            }
            req.end()
        })
    }

    /**
     * Downloads the NVIDIA NIM Installer (or pulls from FS if already downloaded)
     * TODO: should we download the installer or bundle it with the application?
     * @returns {Promise<boolean>} - A promise that resolves to true if the installer was downloaded successfully, false otherwise.
     */
    static async downloadInstaller() {
        const installerPath =
            process.env.NODE_ENV === 'development'
                ? path.resolve(__dirname, 'NIMSetup.exe')
                : // In production, the installer is bundled in the `resources` folder, which contains
                  // this file in resources/backend/index.js.
                  path.resolve(__dirname, 'NIMSetup.exe')

        NimContainerManager.#slog(`Expecting NIM installer at ${installerPath}`)
        if (!fs.existsSync(installerPath)) throw new Error('Could not locate NIM installer on this machine')
        NimContainerManager.#slog(`Running NIM installer at ${installerPath}...`)
        spawnSync(installerPath, {
            stdio: 'inherit',
            shell: true,
            windowsHide: true
        })

        if (!NimContainerManager.getWSLWorkbenchContainer())
            throw new Error('WSL container not found - the installer may have failed to run or complete.')

        NimContainerManager.#slog('Installer downloaded successfully, setting up the container manager...')
        const manager = await NimContainerManager.setupContainerManager()
        if (!manager) throw new Error('Failed to setup NIM container manager')
        return true
    }

    static toUnixPath(path) {
        return path
            .replace(/^([A-Za-z]):/, '/mnt/$1')
            .toLowerCase()
            .replace(/\\/g, '/')
    }

    /**
     * Starts a new container for the given image tag as well as sets it as the active container for NVIDIA NIM
     * @param {string} imageTag - The tag of the image to start the container for.
     * @returns {Promise<boolean>} - A promise that resolves to true if the container was started successfully, false otherwise.
     */
    static async startContainer(imageTag, ngcApiKey = null) {
        const manager = new NimContainerManager()
        if (!manager.client) {
            NimContainerManager.#slog('Container runtime client not available - booting up WSL container service...')
            NimContainerManager.bootWSLContainerService()
        }

        if (!manager.client) throw new Error('Container runtime client not available')
        const image = manager.client.getImage(imageTag)
        if (!image) throw new Error('Image not found')

        // Authenticate with NGC before starting the container - if this is the first time the container is being started
        // some files need to be downloaded from the NGC registry which requires authentication - if the image already exists
        // this step is skipped as it is assumed authentication was done previously
        await manager.authenticateWithKey(ngcApiKey ?? manager.ngcApiKey)
        const response = await manager.podmanRequest('/info', 'GET')
        if (!response.ID) throw new Error('Container runtime could not be reached via HTTP')

        if (process.env.NODE_ENV === 'development' || !!process.env.NGC_PATCH)
            NimContainerManager.#slog('Will apply NGC patch for container mount to bypass GPU utilization limitation.')

        const container = await manager.podmanRequest('/libpod/containers/create', 'POST', {
            image: imageTag,
            terminal: true,
            stdin: true,
            env: {
                NGC_API_KEY: manager.ngcApiKey,
                LOCAL_NIM_CACHE: manager.localNimCache
            },
            portmappings: [
                {
                    container_port: 8000,
                    host_port: 8000,
                    host_ip: '0.0.0.0',
                    protocol: 'tcp'
                }
            ],
            mounts: [
                {
                    // The local nim cache is mounted as a bind mount to the container
                    // however, the path needs to be converted to a unix path for this to work.
                    Source: NimContainerManager.toUnixPath(manager.localNimCache),
                    Destination: '/opt/nim/.cache',
                    type: 'bind'
                },
                ...(process.env.NODE_ENV === 'development' || !!process.env.NGC_PATCH
                    ? [
                          {
                              Source: NimContainerManager.toUnixPath(path.resolve(__dirname, 'ngc_profile_patch.py')),
                              Destination: '/opt/nim/llm/vllm_nvext/hub/ngc_profile.py',
                              type: 'bind'
                          }
                      ]
                    : [])
            ],
            shm_size: 17179869184,
            devices: [
                {
                    path: 'nvidia.com/gpu=all',
                    type: 'gpu'
                }
            ]
        })
        if (!container.Id) throw new Error(`Container could not be created: ${container.message}`)
        const instanceContainer = manager.client.getContainer(container.Id)
        await instanceContainer.start()
        manager.#log('Container started', container.Id)

        const startedContainer = await manager.client
            .listContainers({ all: true })
            .then((containers) => containers.find((cont) => cont.Id === container.Id))
            .catch((err) => {
                console.error('Error listing containers:', err)
                return null
            })
        if (!startedContainer) return null
        const containerInfo = {
            id: startedContainer.Id,
            name: startedContainer.Names[0].replace('/', ''),
            status: startedContainer.State,
            statusText: startedContainer.Status,
            baseUrl: `http://${manager.wslContainerService.ip}:${
                startedContainer.Ports.find((port) => port.Type === 'tcp')?.PublicPort ?? 8000
            }/v1`
        }
        manager.#log('Container started', containerInfo)

        return containerInfo
    }

    /**
     * Pulls an image from the NGC registry
     * @param {string} imageTag - The tag of the image to pull - may include nvcr.io/nim prefix
     * @param {string} ngcApiKey - The NGC API key to use for authentication.
     * @returns {Promise<boolean>} - A promise that resolves to true if the image was pulled successfully, false otherwise.
     */
    static async pullImage(imageTag, ngcApiKey = null) {
        const manager = new NimContainerManager()
        if (!manager.client) {
            NimContainerManager.#slog('Container runtime client not available - booting up WSL container service...')
            NimContainerManager.bootWSLContainerService()
        }

        if (!manager.client) throw new Error('Failed to boot WSL container service')
        await manager.authenticateWithKey(ngcApiKey ?? manager.ngcApiKey)

        let fullTag = imageTag.startsWith('nvcr.io/nim') ? imageTag : `nvcr.io/nim/${imageTag}`
        // if (!fullTag.endsWith(":latest")) fullTag = `${fullTag}:latest`;

        this.#slog(`Pulling image ${fullTag} from NGC registry...`)
        manager.pullImageEmitter.emit('start', `Pulling image ${fullTag} from NGC registry...`)

        new Promise((resolve) => {
            manager.client.pull(
                fullTag,
                {
                    authconfig: {
                        username: '$oauthtoken',
                        password: manager.ngcApiKey,
                        serveraddress: 'nvcr.io'
                    }
                },
                function (err, stream) {
                    if (err) return resolve({ error: err.message })
                    stream.on('data', (chunk) => {
                        let data = {}
                        try {
                            data = JSON.parse(chunk.toString())
                        } catch (err) {
                            data = {}
                        }
                        let msg = data.Status ?? ''
                        if (data.progress) msg += ` ${data.progress}`
                        manager.pullImageEmitter.emit('data', msg)
                    })
                    stream.on('end', () => {
                        manager.pullImageEmitter.emit('data', 'Pulling image from NGC registry completed successfully!')
                        resolve({ error: null })
                    })
                }
            )
        })
            .then(({ error }) => {
                if (error) throw new Error(error)
            })
            .catch((err) => {
                // Handle or log the error here so it's not unhandled
                console.error('Pull error:', err)
                throw new Error(error)
            })

        return true
    }

    /**
     * Streams the pull image events to the response handler
     * @param {import("express").Response} responseHandler - The response handler to stream logs to.
     */
    static async streamPullImageEvents(responseHandler) {
        const manager = new NimContainerManager()
        if (!manager.pullImageEmitter) throw new Error('Pull image emitter not available')

        // First send HTML with auto-scroll script
        responseHandler.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <script>
            setInterval(() => { window.scrollTo(0, document.body.scrollHeight); }, 100);
          </script>
          <style>
            body {
              font-family: monospace;
              background-color: #121212;
              color: #e0e0e0;
            }
          </style>
        </head>
        <body>
          <pre>Beginning to stream pull image events...</pre>
    `)

        manager.pullImageEmitter.on('data', (data) => responseHandler.write(`<pre>${data}</pre>`))
        responseHandler.on('close', () => {
            manager.pullImageEmitter.removeAllListeners()
            responseHandler.write(`</body></html>`)
            responseHandler.destroy()
        })
    }

    /**
     * Streams the logs of a container to the response handler
     * @param {string} containerId - The ID of the container to stream logs for.
     * @param {import("express").Response} responseHandler - The response handler to stream logs to.
     */
    static async streamContainerLogs(containerId, responseHandler = null) {
        if (!responseHandler) throw new Error('No response handler provided')
        const manager = new NimContainerManager()
        if (!manager.client) throw new Error('Container runtime client not available')

        const container = manager.client.getContainer(containerId)
        if (!container) throw new Error('Container not found')

        const containerState = await container.inspect().then((info) => info.State)
        if (!containerState.Running || containerState.Paused) {
            responseHandler.write(`==============================================\n`)
            responseHandler.write(`    Container runtime is not running or paused\n`)
            responseHandler.write(`    Showing last 100 logs and waiting for container to start\n`)
            responseHandler.write(`==============================================\n\n`)
            const tailLogs = await container.logs({
                follow: false,
                stdout: true,
                stderr: true,
                tail: 100,
                timestamps: true
            })
            responseHandler.write(`${tailLogs.toString()}\n`)
            responseHandler.write(`==== Waiting for container to start ====\n\n`)
        }

        let streamStarted = false
        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            since: Number(new Date(containerState.StartedAt)) / 1000,
            timestamps: true
        })

        logStream.on('data', (chunk) => {
            if (!streamStarted) {
                responseHandler.write(
                    `${new Date().toISOString()} [NimContainerManager] Log stream started for container ${containerId}\n\n`
                )
                streamStarted = true
            }
            responseHandler.write(`${chunk.toString()}`)
        })

        logStream.on('error', (error) => {
            console.error('Error streaming logs:', error)
            responseHandler.write(`Error streaming logs: ${error.message}\n`)
            responseHandler.end()
        })

        responseHandler.on('close', () => {
            responseHandler.destroy()
        })
    }

    /****************************************************
     * Instance methods
     ****************************************************/

    /**
     * Updates the NGC API key for the NimContainerManager client
     * @param {string} newKey - The new NGC API key to use.
     */
    updateNimAPIKey(newKey) {
        this.#log(`Updating NGC API Key for NimContainerManager client. ${newKey.slice(0, 10)}...${newKey.slice(-5)}`)
        this.ngcApiKey = newKey
        process.env.NVIDIA_NIM_LLM_NGC_API_KEY = newKey
    }

    /**
     * Determines the configuration mode for NVIDIA NIM
     * "managed" if a runtime is available and can be used
     * "remote" if a runtime is not available and we must fallback to just attaching to a BaseURL
     * @returns {"managed"|"remote"}
     */
    get configMode() {
        return !this.client ? 'remote' : 'managed'
    }

    /**
     * Sets the environment variables for the container runtime client
     * that are required for NVIDIA NIM to work or other functions
     */
    setEnvs() {
        this.setLocalNimCache()
        this.detectNGCApiKey()
    }

    /**
     * Authenticates with the NGC registry using the provided key
     * Stores the key if it is valid and different from the one already stored
     * @param {string} providedKey - The NGC API key to use for authentication.
     * @returns {Promise<boolean>} - A promise that resolves to true if the authentication was successful, false otherwise.
     */
    async authenticateWithKey(providedKey = this.ngcApiKey) {
        if (!providedKey) throw new Error('No NGC API key provided')
        providedKey = providedKey === true ? this.ngcApiKey : providedKey
        this.#log(`Authenticating with NGC API key: ${providedKey.slice(0, 10)}...${providedKey.slice(-5)}`)
        const auth = await this.client.checkAuth({
            serveraddress: 'nvcr.io',
            username: '$oauthtoken',
            password: providedKey
        })

        if (auth.Status !== 'Login Succeeded') throw new Error('Failed to authenticate with NGC with credentials provided or found.')
        if (this.ngcApiKey !== providedKey) {
            this.#log(`Authenticated with new NGC key - storing key for future use, ${providedKey.slice(0, 10)}...${providedKey.slice(-5)}`)
            this.ngcApiKey = providedKey
            process.env.NVIDIA_NIM_LLM_NGC_API_KEY = providedKey
        }

        this.#log('Authenticated with nvcr.io registry successfull!')
        return true
    }

    /**
     * Sets the local NIM cache directory
     * - Detects if set already from system ENV via echo of env variable
     * - Falls back to default location in user's home directory
     * Will set the instance variable `localNimCache`
     * Does not create the directory automatically.
     * @returns {string}
     */
    setLocalNimCache() {
        if (this.localNimCache) return

        // Detect if set already from system ENV
        let systemNimCache
        switch (process.platform) {
            case 'win32':
                systemNimCache = execSync('powershell -command "echo $env:LOCAL_NIM_CACHE"').toString().trim()
                break
            default:
                systemNimCache = execSync('echo $LOCAL_NIM_CACHE').toString().trim()
        }

        if (systemNimCache) {
            this.#log(`Using system NIM cache: ${systemNimCache}`)
            this.localNimCache = systemNimCache
            return
        }

        // Assume no system NIM cache found, use default location
        this.#log('No system NIM cache found, using default location')
        const homeDir = os.homedir()
        this.localNimCache = path.join(homeDir, '.cache', 'nim')

        // Create the directory if it doesn't exist
        if (!fs.existsSync(this.localNimCache)) {
            fs.mkdirSync(this.localNimCache, { recursive: true })
            this.#log(`Created local NIM cache directory at ${this.localNimCache}`)
        }

        return this.localNimCache
    }

    /**
     * Detects the NGC API key from the system ENV
     * - Detects if set already from system ENV via echo of env variable
     * Will set the instance variable `ngcApiKey`
     * Does not throw an error if no NGC API key is found, but logs a message
     * @returns {string|null}
     */
    detectNGCApiKey() {
        if (this.ngcApiKey) return
        if (process.env.NVIDIA_NIM_LLM_NGC_API_KEY) {
            this.#log(
                `Using stored NGC API key: ${process.env.NVIDIA_NIM_LLM_NGC_API_KEY.slice(
                    0,
                    10
                )}...${process.env.NVIDIA_NIM_LLM_NGC_API_KEY.slice(-5)}`
            )
            this.ngcApiKey = process.env.NVIDIA_NIM_LLM_NGC_API_KEY
            return
        }

        // Detect if set already from system ENV
        let systemNgcApiKey
        switch (process.platform) {
            case 'win32':
                systemNgcApiKey = execSync('powershell -command "echo $env:NGC_API_KEY"').toString().trim()
                break
            default:
                systemNgcApiKey = execSync('echo $NGC_API_KEY').toString().trim()
        }

        if (systemNgcApiKey) {
            this.#log(`Using system NGC API key: ${systemNgcApiKey.slice(0, 10)}...${systemNgcApiKey.slice(-5)}`)
            this.ngcApiKey = systemNgcApiKey
            return
        }

        this.#log('No system NGC API key found. It must be set for NVIDIA NIM to work.')
        return
    }

    /**
     * Gets the user's image library as well as container information if available for any images
     * @returns {Promise<{name: string, id: string, tag: string, container: {id: string, name: string, status: string, statusText: string, baseUrl: string}|null, size: number}[]>}
     */
    static async userImageLibrary() {
        const manager = new NimContainerManager()
        if (!manager.client) {
            NimContainerManager.#slog('Container runtime client not available - booting up WSL container service...')
            NimContainerManager.bootWSLContainerService()
        }

        if (!manager.client) throw new Error('Container runtime client not available')
        try {
            const containers = await manager.client.listContainers({ all: true })
            const foundImages = (await manager.client.listImages())
                .filter((image) => image.RepoTags[0].startsWith('nvcr.io/nim') && image.Labels['com.nvidia.nim.type'] === 'llm')
                .map((image) => {
                    let container = null

                    // If there are multiple containers for the same image, use the running one
                    const imageContainers = containers.filter((container) => container.ImageID === image.Id)
                    if (imageContainers.length > 1) container = imageContainers.find((container) => container.State === 'running')
                    // Otherwise, just use the first one
                    if (!container) container = imageContainers?.[0]

                    return {
                        id: image.Id,
                        name: image.Labels['com.nvidia.nim.model'],
                        tag: image.RepoTags[0],
                        container: container
                            ? {
                                  id: container.Id,
                                  name: container.Names[0].replace('/', ''),
                                  status: container.State,
                                  statusText: container.Status,
                                  baseUrl: `http://${manager.wslContainerService.ip}:${
                                      container.Ports.find((port) => port.Type === 'tcp')?.PublicPort ?? 8000
                                  }/v1`
                              }
                            : null,
                        size: image.Size
                    }
                })
            return foundImages
        } catch (error) {
            console.error(error)
            return []
        }
    }

    /**
     * Gets the current configuration for NVIDIA NIM
     * @returns {Promise<{
     * images: {id: string, name: string, tag: string, container: {id: string, name: string, status: string, baseUrl: string}|null, size: number}[],
     * localNimCache: string,
     * ngcApiKey: boolean,
     * containerRuntimeIsAvailable: boolean - this determines if the WSL Workbench container exists (but does not check if it is running)
     * }>}
     */
    async getConfig() {
        const defaultConfig = {
            images: [],
            localNimCache: this.localNimCache,
            ngcApiKey: !!this.ngcApiKey,
            canRunManaged: process.platform === 'win32' && process.arch === 'x64', // Only Windows x64 can run managed mode
            needsToRunInstaller: false,
            containerRuntimeIsAvailable: false
        }

        // Check if the container runtime is available
        const wslWorkbenchContainer = NimContainerManager.getWSLWorkbenchContainer()
        if (!!wslWorkbenchContainer && !!this.client) {
            return {
                ...defaultConfig,
                images: await this.userImageLibrary(),
                needsToRunInstaller: false,
                containerRuntimeIsAvailable: true
            }
        }

        return {
            ...defaultConfig,
            needsToRunInstaller: !wslWorkbenchContainer,
            containerRuntimeIsAvailable: !!wslWorkbenchContainer
        }
    }

    /**
     * Instance log method
     * @param {string} text
     * @param {...any} args
     */
    #log(text, ...args) {
        console.log(`\x1b[35m[NimContainerManager]\x1b[0m ${text}`, ...args)
    }
}

module.exports = { NimContainerManager }
