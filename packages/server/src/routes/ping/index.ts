import express from 'express'
import pingController from '../../controllers/ping'
const router = express.Router()

// GET
router.get('/', pingController.getPing)

export default router
