import toolsController from '../../controllers/tools'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['tools:create'], toolsController.createTool)

// READ
router.get('/', ['tools:view'], toolsController.getAllTools)
router.get('/:id', ['tools:view'], toolsController.getToolById)

// UPDATE
router.put('/:id', ['tools:update'], toolsController.updateTool)

// DELETE
router.delete('/:id', ['tools:delete'], toolsController.deleteTool)

export default router.getRouter()
