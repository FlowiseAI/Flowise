import variablesController from '../../controllers/variables'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.variables.create], variablesController.createVariable)

// READ
router.get('/', [Entitlements.variables.view], variablesController.getAllVariables)

// UPDATE
router.put('/:id', [Entitlements.variables.update], variablesController.updateVariable)

// DELETE
router.delete('/:id', [Entitlements.variables.delete], variablesController.deleteVariable)

export default router.getRouter()
