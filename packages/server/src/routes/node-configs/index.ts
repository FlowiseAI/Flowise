import express, { Router } from 'express'
import nodeConfigsController from '../../controllers/node-configs'
const router: Router = express.Router()

// CREATE
router.post('/', nodeConfigsController.getAllNodeConfigs)

export default router
