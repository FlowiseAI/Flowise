import express from 'express'
import credentialsController from '../../controllers/credentials'
const router = express.Router()

// CREATE

// READ
router.get('/', credentialsController.getAllCredentials)

// UPDATE

// DELETE

export default router
