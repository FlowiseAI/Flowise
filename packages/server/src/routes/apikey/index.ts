import apikeyController from '../../controllers/apikey'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.apikeys.create], apikeyController.createApiKey)
router.post('/import', [Entitlements.apikeys.import], apikeyController.importKeys)

// READ
router.get('/', [Entitlements.apikeys.view], apikeyController.getAllApiKeys)

// UPDATE
router.put(['/', '/:id'], [Entitlements.apikeys.update], apikeyController.updateApiKey)

// DELETE
router.delete(['/', '/:id'], [Entitlements.apikeys.delete], apikeyController.deleteApiKey)

export default router
