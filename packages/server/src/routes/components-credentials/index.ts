import express from 'express'
import componentsCredentialsController from '../../controllers/components-credentials'
const router = express.Router()

// CREATE

// READ
router.get('/', componentsCredentialsController.getAllComponentsCredentials)
router.get('/:name', componentsCredentialsController.getSingleComponentsCredential)

// UPDATE

// DELETE

export default router
