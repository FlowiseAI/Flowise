import express from 'express'
import fetchLinksController from '../../controllers/fetch-links'
const router = express.Router()

// CREATE

// READ
router.get('/', fetchLinksController.getAllLinks)

// UPDATE

// DELETE

export default router
