import express from 'express'
import ipController from '../../controllers/ip'
const router = express.Router()

// CREATE

// READ
router.get('/', ipController.configureProxyNrInHostEnv)

// UPDATE

// DELETE

export default router
