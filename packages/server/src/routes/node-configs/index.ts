import express from 'express'
import nodeConfigsController from '../../controllers/node-configs'
const router = express.Router()

// CREATE
router.post('/', nodeConfigsController.getAllNodeConfigs)

export default router
