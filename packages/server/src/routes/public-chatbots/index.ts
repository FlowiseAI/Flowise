
import chatflowsController from '../../controllers/chatflows';
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], ['public'], chatflowsController.getSinglePublicChatbotConfig);

export default router.getRouter();
