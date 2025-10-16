import credentialsController from '../../controllers/credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.credentials.create], credentialsController.createCredential)

// READ
router.get('/', [Entitlements.credentials.view], credentialsController.getAllCredentials)
router.get('/:id', [Entitlements.credentials.view], credentialsController.getCredentialById)

// UPDATE
router.put('/:id', [Entitlements.credentials.update], credentialsController.updateCredential)

// DELETE
router.delete('/:id', [Entitlements.credentials.delete], credentialsController.deleteCredentials)

export default router
