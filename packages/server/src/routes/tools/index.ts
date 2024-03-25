import express from 'express'
import toolsController from '../../controllers/tools'

const router = express.Router()

// CREATE

// READ
router.get('/', toolsController.getAllTools)

// UPDATE

// DELETE

export default router
