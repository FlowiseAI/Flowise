/* eslint-disable no-console */
import express from 'express'
import salesforceAuthController from '../../controllers/salesforce-auth'
import passport from 'passport'

const router = express.Router()

router.get('/', salesforceAuthController.authenticate)
router.get('/error', (req, res) => {
    const messages = (req.session as any)?.messages || []
    const errorMessage = messages.length > 0 ? messages[messages.length - 1] : req.query.error
    res.json({ error: errorMessage })
})
router.get('/callback', (req, res, next) => {
    passport.authenticate('salesforce-dynamic', (err: any, user: any, info: any) => {
        console.log('Error:', err)
        console.log('User:', user)
        console.log('Info:', info)

        if (err || !user) {
            const errorMsg = err?.message || info?.message || 'Authentication failed'
            return res.redirect(`/api/v1/salesforce-auth/error?error=${encodeURIComponent(errorMsg)}`)
        }

        req.user = user
        salesforceAuthController.salesforceAuthCallback(req, res)
    })(req, res, next)
})

export default router
