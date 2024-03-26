import express from 'express'
import apikeysController from '../../controllers/apikeys'
const router = express.Router()

// CREATE

// READ
router.get('/apikey/:apikey', apikeysController.verifyApiKey)

// UPDATE

// DELETE

export default router
