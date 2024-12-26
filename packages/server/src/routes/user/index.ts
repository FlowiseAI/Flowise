import express, { Router } from 'express'

import userController from '../../controllers/user'

const router: Router = express.Router()

// User routes
router.post('/register', userController.registerUser)
router.post('/login', userController.loginUser)
router.get('/:id', userController.getUserById)

export default router
