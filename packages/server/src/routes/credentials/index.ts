import express from 'express'
import credentialsController from '../../controllers/credentials'
const router = express.Router()

// CREATE
router.post('/', credentialsController.createCredential)

// READ
router.get('/', credentialsController.getAllCredentials)

// UPDATE

// DELETE

export default router
