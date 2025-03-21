import axios from 'axios'
import { NextFunction, Request, Response } from 'express'

const { NimContainerManager } = require('flowise-nim-container-manager')

const getToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        }
        const data = {
            client_id: 'Flowise',
            pdi: '0x1234567890abcdeg',
            access_policy_name: 'nim-dev'
        }
        const response = await axios.post('https://nts.ngc.nvidia.com/v1/token', data, { headers })
        const responseJson = response.data
        return res.json(responseJson)
    } catch (error) {
        next(error)
    }
}

const preload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await NimContainerManager.preload()
        return res.send('Preloaded NIM')
    } catch (error) {
        next(error)
    }
}

const downloadInstaller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await NimContainerManager.downloadInstaller()
        return res.send('NIM Installer completed successfully!')
    } catch (error) {
        next(error)
    }
}

const pullImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        const apiKey = req.body.apiKey
        await NimContainerManager.pullImage(imageTag, apiKey)
        return res.send(`Pulling image ${imageTag}`)
    } catch (error) {
        next(error)
    }
}

const startContainer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        const apiKey = req.body.apiKey
        const hostPort = req.body.hostPort
        const nimRelaxMemConstraints = parseInt(req.body.nimRelaxMemConstraints)
        // Validate nimRelaxMemConstraints
        if (isNaN(nimRelaxMemConstraints) || (nimRelaxMemConstraints !== 0 && nimRelaxMemConstraints !== 1)) {
            return res.status(400).send('nimRelaxMemConstraints must be 0 or 1')
        }
        await NimContainerManager.startContainer(imageTag, apiKey, hostPort, nimRelaxMemConstraints)
        return res.send(`Starting container ${imageTag}`)
    } catch (error) {
        next(error)
    }
}

const getImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        const images = await NimContainerManager.userImageLibrary()
        const image = images.find((img: any) => img.tag === imageTag)
        if (!image) {
            return res.status(404).send(`Image ${imageTag} not found`)
        }
        return res.json(image)
    } catch (error) {
        next(error)
    }
}

const getContainer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        const port = req.body.port

        // First check if the image exists
        const images = await NimContainerManager.userImageLibrary()
        const image = images.find((img: any) => img.tag === imageTag)
        if (!image) {
            return res.status(404).send(`Image ${imageTag} not found`)
        }

        // Get all running containers
        const containers = await NimContainerManager.listRunningContainers()

        // Check if port is in use
        const portInUse = containers.find((cont: any) => cont.port === port)
        if (portInUse) {
            // Check if the container using this port is from one of our model options
            const modelOptions = [
                'nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.0-RTX',
                'nvcr.io/nim/deepseek-ai/deepseek-r1-distill-llama-8b:1.8.0-RTX',
                'nvcr.io/nim/nv-mistralai/mistral-nemo-12b-instruct:1.8.0-rtx'
            ]
            const isModelContainer = modelOptions.includes(portInUse.image)

            if (isModelContainer) {
                // If it's a model container, return it for the "use existing" flow
                portInUse.image = image.name
                return res.json(portInUse)
            } else {
                // If it's not a model container, return a special error
                return res.status(409).send({
                    message: `Port ${port} is already in use by another container`,
                    container: portInUse
                })
            }
        }

        // If no container found with matching port, return 404
        return res.status(404).send(`Container of ${imageTag} with port ${port} not found`)
    } catch (error) {
        next(error)
    }
}

const listRunningContainers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const containers = await NimContainerManager.listRunningContainers()
        return res.json(containers)
    } catch (error) {
        next(error)
    }
}

const stopContainer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const containerId = req.body.containerId
        const containerInfo = await NimContainerManager.stopContainer(containerId)
        return res.json(containerInfo)
    } catch (error) {
        next(error)
    }
}

export default {
    preload,
    getToken,
    downloadInstaller,
    pullImage,
    startContainer,
    getImage,
    getContainer,
    listRunningContainers,
    stopContainer
}
