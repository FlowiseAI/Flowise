import express, { Router } from 'express'

import userController from '../../controllers/user'

const router: Router = express.Router()

// User routes
router.get('/group/:groupname', userController.getUsersByGroup)
router.get('/grouped-users', userController.getAllUsersGroupedByGroupname)
router.post('/register', userController.registerUser)
router.post('/remove-user', userController.removeUser)
router.post('/login', userController.loginUser)
router.get('/:id', userController.getUserById)

export default router
