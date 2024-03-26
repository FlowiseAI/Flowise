import express from 'express'
import apikeyRouter from './apikey'
import assistantsRouter from './assistants'
import chatflowsRouter from './chatflows'
import chatflowsStreamingRouter from './chatflows-streaming'
import chatflowsUploadsRouter from './chatflows-uploads'
import credentialsRouter from './credentials'
import nodesRouter from './nodes'
import toolsRouter from './tools'
import variablesRouter from './variables'

const router = express.Router()

router.use('/apikey', apikeyRouter)
router.use('/assistants', assistantsRouter)
router.use('/chatflows', chatflowsRouter)
router.use('/chatflows-streaming', chatflowsStreamingRouter)
router.use('/chatflows-uploads', chatflowsUploadsRouter)
router.use('/credentials', credentialsRouter)
router.use('/nodes', nodesRouter)
router.use('/tools', toolsRouter)
router.use('/variables', variablesRouter)

export default router
