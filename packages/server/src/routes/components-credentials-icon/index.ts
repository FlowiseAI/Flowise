import express, { Router } from 'express'
import componentsCredentialsController from '../../controllers/components-credentials'
const router: Router = express.Router()

// CREATE

// READ
router.get(['/', '/:name'], componentsCredentialsController.getSingleComponentsCredentialIcon)

// UPDATE

// DELETE

export default router
