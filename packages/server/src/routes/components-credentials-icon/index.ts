import express from 'express'
import componentsCredentialsController from '../../controllers/components-credentials'
const router = express.Router()

// CREATE

// READ
router.get(['/', '/:name'], componentsCredentialsController.getSingleComponentsCredentialIcon)

// UPDATE

// DELETE

export default router
