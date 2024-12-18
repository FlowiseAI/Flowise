import express, { Router } from 'express'
import fetchLinksController from '../../controllers/fetch-links'
const router: Router = express.Router()

// READ
router.get('/', fetchLinksController.getAllLinks)

export default router
