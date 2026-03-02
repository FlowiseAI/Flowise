import express from 'express'
import channelWebhooksController from '../../controllers/channel-webhooks'
import logger from '../../utils/logger'

const router = express.Router()

router.use((req, res, next) => {
    if (process.env.CHANNEL_WEBHOOK_DEBUG === 'true') {
        logger.info(
            `[channel-webhook-debug] route-enter method=${req.method} path=${req.path} provider=${req.params.provider ?? ''} webhookPath=${req.params.webhookPath ?? ''}`
        )
        res.on('finish', () => {
            logger.info(
                `[channel-webhook-debug] route-exit method=${req.method} path=${req.path} status=${res.statusCode} provider=${req.params.provider ?? ''} webhookPath=${req.params.webhookPath ?? ''}`
            )
        })
    }
    next()
})

router.get('/:provider/:webhookPath', channelWebhooksController.verifyMetaChallenge)
router.post('/:provider/:webhookPath', channelWebhooksController.handleWebhook)

export default router
