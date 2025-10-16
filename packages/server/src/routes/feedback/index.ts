import feedbackController from '../../controllers/feedback'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE
router.post(['/', '/:id'], [Entitlements.unspecified], feedbackController.createChatMessageFeedbackForChatflow)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], feedbackController.getAllChatMessageFeedback)

// UPDATE
router.put(['/', '/:id'], [Entitlements.unspecified], feedbackController.updateChatMessageFeedbackForChatflow)

export default router
