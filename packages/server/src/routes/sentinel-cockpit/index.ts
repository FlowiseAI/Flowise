import express from 'express'
import sentinelCockpitController from '../../controllers/sentinel-cockpit'

const router = express.Router()

router.use(sentinelCockpitController.handleSnapshot)

export default router
