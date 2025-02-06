import express, { Router } from 'express'

import userController from '../../controllers/user'

const router: Router = express.Router()

// User routes
router.post('/login', userController.loginUser)

export default router
