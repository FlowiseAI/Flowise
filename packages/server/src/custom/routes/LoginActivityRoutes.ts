import express from 'express'
import { LoginActivityController } from '../controllers/LoginActivityController'

const router = express.Router()
const loginActivityController = new LoginActivityController()

router.get('/user/:username', loginActivityController.getUserActivity)
router.get('/recent', loginActivityController.getRecentActivity)
router.get('/failed/:username', loginActivityController.getFailedAttempts)

export default router
