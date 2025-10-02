
import executionController from '../../controllers/executions';
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], ['public'], executionController.getPublicExecutionById);

export default router.getRouter();
