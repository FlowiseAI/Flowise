import express from 'express'
import credentialsController from '../../controllers/credentials'
const router = express.Router()

// CREATE
router.post('/', credentialsController.createCredential)

// READ
router.get('/', credentialsController.getAllCredentials)
router.get('/:id', credentialsController.getSingleCredential)

// UPDATE
router.put('/', credentialsController.updateCredential)

// DELETE
router.delete('/:id', credentialsController.deleteAllCredentials)

export default router
