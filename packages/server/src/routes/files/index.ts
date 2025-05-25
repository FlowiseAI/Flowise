import express from 'express'
import filesController from '../../controllers/files'
const router = express.Router()

// READ
router.get('/', filesController.getAllFiles)

// DELETE
router.delete('/', filesController.deleteFile)

export default router
