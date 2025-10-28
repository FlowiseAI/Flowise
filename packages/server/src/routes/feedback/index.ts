import feedbackController from '../../controllers/feedback'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    ['/', '/:id'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    feedbackController.createChatMessageFeedbackForChatflow
)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], feedbackController.getAllChatMessageFeedback)

// UPDATE
router.put(
    ['/', '/:id'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    feedbackController.updateChatMessageFeedbackForChatflow
)

export default router
