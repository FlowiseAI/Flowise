import express from 'express'
import googleAuthController from '../../controllers/google-auth'
import passport from 'passport'

const router = express.Router()

router.get('/google-auth', googleAuthController.authenticate)
router.get('/google-auth/callback', passport.authenticate('google', { failureRedirect: '/' }), googleAuthController.googleAuthCallback)

export default router
