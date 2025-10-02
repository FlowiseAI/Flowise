
import openaiRealTimeController from '../../controllers/openai-realtime';
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// GET
router.get(['/', '/:id'], ['public'], openaiRealTimeController.getAgentTools);

// EXECUTE
router.post(['/', '/:id'], ['public'], openaiRealTimeController.executeAgentTool);

export default router.getRouter();
