import express from 'express'
import fetchLinksController from '../../controllers/fetch-links'
const router = express.Router()

// READ
router.get('/', fetchLinksController.getAllLinks)

export default router
