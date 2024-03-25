import express from 'express'
import variablesController from '../../controllers/variables'

const router = express.Router()

// CREATE

// READ
router.get('/', variablesController.getAllVariables)

// UPDATE

// DELETE

export default router
