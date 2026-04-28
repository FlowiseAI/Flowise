import express from 'express'
import settingsController from '../../controllers/settings'
const router = express.Router()

// CREATE
router.get('/', settingsController.getSettingsList)

export default router
