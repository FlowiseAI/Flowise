import credentialsController from '../../controllers/credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    '/',
    [Entitlements.credentials.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    credentialsController.createCredential
)

// READ
router.get(
    '/',
    [Entitlements.credentials.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    credentialsController.getAllCredentials
)
router.get(
    '/:id',
    [Entitlements.credentials.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    credentialsController.getCredentialById
)

// UPDATE
router.put(
    '/:id',
    [Entitlements.credentials.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    credentialsController.updateCredential
)

// DELETE
router.delete(
    '/:id',
    [Entitlements.credentials.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    credentialsController.deleteCredentials
)

export default router
