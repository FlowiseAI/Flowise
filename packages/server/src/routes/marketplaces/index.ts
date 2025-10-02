import marketplacesController from '../../controllers/marketplaces'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/templates', ['templates:marketplace'], marketplacesController.getAllTemplates)

router.post('/custom', ['templates:flowexport', 'templates:toolexport'], marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', ['templates:custom'], marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], ['templates:custom-delete'], marketplacesController.deleteCustomTemplate)

export default router.getRouter()
