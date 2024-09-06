import express from 'express'
import variablesController from '../../controllers/variables'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()
// CREATE
router.post('/', enforceAbility('Variable'), variablesController.createVariable)

// READ
router.get('/', enforceAbility('Variable'), variablesController.getAllVariables)

// UPDATE
router.put(['/', '/:id'], enforceAbility('Variable'), variablesController.updateVariable)

// DELETE
router.delete(['/', '/:id'], enforceAbility('Variable'), variablesController.deleteVariable)

export default router
