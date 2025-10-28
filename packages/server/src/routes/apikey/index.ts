import apikeyController from '../../controllers/apikey'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.apikeys.create], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], apikeyController.createApiKey)
router.post(
    '/import',
    [Entitlements.apikeys.import],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    apikeyController.importKeys
)

// READ
router.get('/', [Entitlements.apikeys.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], apikeyController.getAllApiKeys)

// UPDATE
router.put(
    ['/', '/:id'],
    [Entitlements.apikeys.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    apikeyController.updateApiKey
)

// DELETE
router.delete(
    ['/', '/:id'],
    [Entitlements.apikeys.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    apikeyController.deleteApiKey
)

export default router
