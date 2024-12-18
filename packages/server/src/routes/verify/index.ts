import express, { Router } from 'express'
import apikeyController from '../../controllers/apikey'
const router: Router = express.Router()

// READ
router.get(['/apikey/', '/apikey/:apikey'], apikeyController.verifyApiKey)

export default router
