import express, { Router } from 'express'
import pingController from '../../controllers/ping'
const router: Router = express.Router()

// GET
router.get('/', pingController.getPing)

export default router
