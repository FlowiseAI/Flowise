import express, { Router } from 'express'
import promptsListController from '../../controllers/prompts-lists'
const router: Router = express.Router()

// CREATE
router.post('/', promptsListController.createPromptsList)

export default router
