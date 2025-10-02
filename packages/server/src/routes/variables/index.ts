import variablesController from '../../controllers/variables'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['variables:create'], variablesController.createVariable)

// READ
router.get('/', ['variables:view'], variablesController.getAllVariables)

// UPDATE
router.put('/:id', ['variables:update'], variablesController.updateVariable)

// DELETE
router.delete('/:id', ['variables:delete'], variablesController.deleteVariable)

export default router.getRouter()
