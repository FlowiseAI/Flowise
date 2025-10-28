import nimController from '../../controllers/nvidia-nim'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/preload', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.preload)
router.get('/get-token', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.getToken)
router.get('/download-installer', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.downloadInstaller)
router.get('/list-running-containers', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.listRunningContainers)
router.post('/pull-image', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.pullImage)
router.post('/start-container', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.startContainer)
router.post('/stop-container', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.stopContainer)
router.post('/get-image', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.getImage)
router.post('/get-container', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nimController.getContainer)

export default router
