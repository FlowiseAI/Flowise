import nimController from '../../controllers/nvidia-nim'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/preload', [Entitlements.unspecified], nimController.preload)
router.get('/get-token', [Entitlements.unspecified], nimController.getToken)
router.get('/download-installer', [Entitlements.unspecified], nimController.downloadInstaller)
router.get('/list-running-containers', [Entitlements.unspecified], nimController.listRunningContainers)
router.post('/pull-image', [Entitlements.unspecified], nimController.pullImage)
router.post('/start-container', [Entitlements.unspecified], nimController.startContainer)
router.post('/stop-container', [Entitlements.unspecified], nimController.stopContainer)
router.post('/get-image', [Entitlements.unspecified], nimController.getImage)
router.post('/get-container', [Entitlements.unspecified], nimController.getContainer)

export default router
