import attachmentsController from '../../controllers/attachments'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    '/:chatflowId/:chatId',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    getMulterStorage().array('files'),
    attachmentsController.createAttachment
)

export default router
