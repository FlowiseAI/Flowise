import express, { Router } from 'express'
import credentialsController from '../../controllers/credentials'
const router: Router = express.Router()

// CREATE
router.post('/', credentialsController.createCredential)

// READ
router.get('/', credentialsController.getAllCredentials)
router.get(['/', '/:id'], credentialsController.getCredentialById)

// UPDATE
router.put(['/', '/:id'], credentialsController.updateCredential)

// DELETE
router.delete(['/', '/:id'], credentialsController.deleteCredentials)

export default router
