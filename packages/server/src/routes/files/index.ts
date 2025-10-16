import express from 'express'
import filesController from '../../controllers/files'
import { entitled } from '../../services/entitled-router'
const router = entitled.Router()

// READ
router.get('/', filesController.getAllFiles)

// DELETE
router.delete('/', filesController.deleteFile)

export default router
