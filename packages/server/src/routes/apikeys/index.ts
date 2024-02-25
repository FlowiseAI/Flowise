import express from 'express'
import apikeysController from '../../controllers/apikeys'
const router = express.Router()

// CREATE
router.post('/', apikeysController.createApiKey)

// READ
//router.get('/', apikeysController.getAllApiKeys)

// UPDATE
//router.put('/', apikeysController.updateApiKey)

// DELETE
//router.delete('/', apikeysController.deleteApiKey)

export default router
