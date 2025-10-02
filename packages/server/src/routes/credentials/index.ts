import credentialsController from '../../controllers/credentials'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['credentials:create'], credentialsController.createCredential)

// READ
router.get('/', ['credentials:view'], credentialsController.getAllCredentials)
router.get('/:id', ['credentials:view'], credentialsController.getCredentialById)

// UPDATE
router.put('/:id', ['credentials:update'], credentialsController.updateCredential)

// DELETE
router.delete('/:id', ['credentials:delete'], credentialsController.deleteCredentials)

export default router.getRouter()
