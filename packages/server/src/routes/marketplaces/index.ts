import express, { Router } from 'express'
import marketplacesController from '../../controllers/marketplaces'
const router: Router = express.Router()

// READ
router.get('/templates', marketplacesController.getAllTemplates)

router.post('/custom', marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], marketplacesController.deleteCustomTemplate)

export default router
