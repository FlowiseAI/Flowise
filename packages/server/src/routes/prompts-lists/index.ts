import express from 'express'
import promptsListController from '../../controllers/prompts-lists'
const router = express.Router()

// CREATE
router.post('/', promptsListController.createPromptsList)

export default router
