import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
const router = express.Router()

// CREATE

// READ
router.get('/templates', marketplacesController.getAllTemplates)

// UPDATE

// DELETE

export default router
