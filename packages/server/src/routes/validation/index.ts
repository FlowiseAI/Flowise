import express from 'express'
import validationController from '../../controllers/validation'
const router = entitled.Router()

// READ
router.get('/:id', validationController.checkFlowValidation)

export default router
