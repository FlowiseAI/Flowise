import express from 'express'
import versionsController from '../../controllers/versions'
const router = express.Router()

// CREATE

// READ
router.get('/', versionsController.getVersion)

// UPDATE

// DELETE

export default router
