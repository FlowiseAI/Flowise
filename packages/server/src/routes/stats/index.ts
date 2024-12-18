import express, { Router } from 'express'
import statsController from '../../controllers/stats'

const router: Router = express.Router()

// READ
router.get(['/', '/:id'], statsController.getChatflowStats)

export default router
