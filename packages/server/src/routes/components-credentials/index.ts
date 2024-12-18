import express, { Router } from 'express'
import componentsCredentialsController from '../../controllers/components-credentials'
const router: Router = express.Router()

// READ
router.get('/', componentsCredentialsController.getAllComponentsCredentials)
router.get(['/', '/:name'], componentsCredentialsController.getComponentByName)

export default router
