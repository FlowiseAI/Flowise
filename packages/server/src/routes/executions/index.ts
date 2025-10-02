import executionController from '../../controllers/executions'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', ['executions:view'], executionController.getAllExecutions)
router.get('/:id', ['executions:view'], executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], ['public'], executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', ['executions:delete'], executionController.deleteExecutions)
router.delete('/', ['executions:delete'], executionController.deleteExecutions)

export default router.getRouter()
