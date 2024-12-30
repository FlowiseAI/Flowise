import express from 'express'
import authController from '../../controllers/auth'
import passport from 'passport'

const router = express.Router()

router.get('/google', authController.authenticate)
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), authController.googleAuthCallback)

export default router
