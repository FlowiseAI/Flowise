import express from 'express'
import googleAuthController from '../../controllers/google-auth'
import passport from 'passport'

const router = express.Router()

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/google-auth', googleAuthController.authenticate)
    router.get('/google-auth/callback', passport.authenticate('google', { failureRedirect: '/' }), googleAuthController.googleAuthCallback)
} else {
    router.get('/google-auth', (req, res) => {
        res.status(400).json({ error: 'Google client ID and secret are not set' })
    })
    router.get('/google-auth/callback', (req, res) => {
        res.status(400).json({ error: 'Google client ID and secret are not set' })
    })
}

export default router
