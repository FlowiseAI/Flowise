import express from 'express'
import salesforceAuthController from '../../controllers/salesforce-auth'
import passport from 'passport'

const router = express.Router()

router.get('/salesforce-auth', salesforceAuthController.authenticate)
router.get(
    '/salesforce-auth/callback',
    passport.authenticate('salesforce-dynamic', { failureRedirect: '/' }),
    salesforceAuthController.salesforceAuthCallback
)

export default router
