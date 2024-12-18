import express, { Router } from 'express'
import versionsController from '../../controllers/versions'
const router: Router = express.Router()

// READ
router.get('/', versionsController.getVersion)

export default router
