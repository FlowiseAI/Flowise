import express from 'express'
import apikeyController from '../../controllers/apikey'
const router = entitled.Router()

// READ
router.get(['/apikey/', '/apikey/:apikey'], apikeyController.verifyApiKey)

export default router
