import express from 'express'
import credentialsController from '../../controllers/credentials'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

// CREATE
router.post('/', enforceAbility('Credential'), credentialsController.createCredential)

// READ
router.get('/', enforceAbility('Credential'), credentialsController.getAllCredentials)
router.get(['/', '/:id'], enforceAbility('Credential'), credentialsController.getCredentialById)

// UPDATE
router.put(['/', '/:id'], enforceAbility('Credential'), credentialsController.updateCredential)

// DELETE
router.delete(['/', '/:id'], enforceAbility('Credential'), credentialsController.deleteCredentials)

export default router
