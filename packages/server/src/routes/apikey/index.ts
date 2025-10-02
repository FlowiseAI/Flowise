import apikeyController from '../../controllers/apikey'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['apikeys:create'], apikeyController.createApiKey)
router.post('/import', ['apikeys:import'], apikeyController.importKeys)

// READ
router.get('/', ['apikeys:view'], apikeyController.getAllApiKeys)

// UPDATE
router.put(['/', '/:id'], ['apikeys:update'], apikeyController.updateApiKey)

// DELETE
router.delete(['/', '/:id'], ['apikeys:delete'], apikeyController.deleteApiKey)

export default router.getRouter()
