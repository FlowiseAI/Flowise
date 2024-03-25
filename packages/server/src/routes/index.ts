import express from 'express'
import apikeyRouter from './apikey'
import variablesRouter from './variables'

const router = express.Router()

router.use('/apikey', apikeyRouter)
router.use('/variables', variablesRouter)

export default router
