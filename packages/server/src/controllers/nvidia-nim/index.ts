import axios from 'axios'
import { NextFunction, Request, Response } from 'express'
import logger from '../../utils/logger'

const { NimContainerManager } = require('nim-container-manager')

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
        await NimContainerManager.startContainer(imageTag, apiKey)
        return res.send(`Starting container ${imageTag}`)
    } catch (error) {
        next(error)
    }
}

const getImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        logger.info('[NIM Debug] Getting image with tag:', imageTag)
        const images = await NimContainerManager.userImageLibrary()
        logger.info('[NIM Debug] userImageLibrary response:', images)
        const image = images.find((img: any) => img.tag === imageTag)
        if (!image) {
            logger.info('[NIM Debug] Image not found in library')
            return res.status(404).send(`Image ${imageTag} not found`)
        }
        return res.json(image)
    } catch (error) {
        logger.error('[NIM Debug] Error in getImage:', error)
        next(error)
    }
}

const getContainer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imageTag = req.body.imageTag
        logger.info('[NIM Debug] Getting container for image tag:', imageTag)
        const images = await NimContainerManager.userImageLibrary()
        logger.info('[NIM Debug] userImageLibrary response for container:', images)
        const image = images.find((img: any) => img.tag === imageTag)
        if (!image) {
            logger.info('[NIM Debug] Image not found in library for container')
            return res.status(404).send(`Image ${imageTag} not found`)
        }
        if (!image.container) {
            logger.info('[NIM Debug] Container not found for image')
            return res.status(404).send(`Container of ${imageTag} not found`)
        }
        const container = image.container
        container.image = image.name
        return res.json(container)
    } catch (error) {
        logger.error('[NIM Debug] Error in getContainer:', error)
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
    getContainer
}
