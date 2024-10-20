import express from 'express'
import multer from 'multer'
import path from 'path'
import predictionsController from '../../controllers/predictions'

const router = express.Router()

const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

// CREATE
router.post(['/', '/:id'], upload.array('files'), predictionsController.getRateLimiterMiddleware, predictionsController.createPrediction)

export default router
