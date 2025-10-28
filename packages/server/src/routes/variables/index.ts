import variablesController from '../../controllers/variables'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    '/',
    [Entitlements.variables.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    variablesController.createVariable
)

// READ
router.get(
    '/',
    [Entitlements.variables.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    variablesController.getAllVariables
)

// UPDATE
router.put(
    '/:id',
    [Entitlements.variables.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    variablesController.updateVariable
)

// DELETE
router.delete(
    '/:id',
    [Entitlements.variables.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    variablesController.deleteVariable
)

export default router
