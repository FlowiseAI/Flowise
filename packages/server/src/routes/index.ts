import express from 'express'
import apikeyRouter from './apikey'

const router = express.Router()

router.use('/apikey', apikeyRouter)

export default router
