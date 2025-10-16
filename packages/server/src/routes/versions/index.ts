import express from 'express'
import versionsController from '../../controllers/versions'
const router = entitled.Router()

// READ
router.get('/', versionsController.getVersion)

export default router
