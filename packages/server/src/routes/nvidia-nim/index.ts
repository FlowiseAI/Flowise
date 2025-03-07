import express from 'express'
import nimController from '../../controllers/nvidia-nim'
const router = express.Router()

// READ
router.get('/preload', nimController.preload)
router.get('/get-token', nimController.getToken)
router.get('/download-installer', nimController.downloadInstaller)
router.post('/pull-image', nimController.pullImage)
router.post('/start-container', nimController.startContainer)
router.post('/get-image', nimController.getImage)
router.post('/get-container', nimController.getContainer)

export default router
