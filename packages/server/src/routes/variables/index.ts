import express from 'express'
import variablesController from '../../controllers/variables'

const router = express.Router()

// CREATE
router.post('/', variablesController.createVariable)

// READ
router.get('/', variablesController.getAllVariables)

// UPDATE

// DELETE

export default router
