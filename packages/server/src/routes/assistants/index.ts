import express from 'express'
import assistantsController from '../../controllers/assistants'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CREATE
router.post('/', checkPermission('assistants:create'), assistantsController.createAssistant)

// READ
router.get('/', checkPermission('assistants:view'), assistantsController.getAllAssistants)
router.get(['/', '/:id'], checkPermission('assistants:view'), assistantsController.getAssistantById)

// UPDATE
router.put(['/', '/:id'], checkAnyPermission('assistants:create,assistants:update'), assistantsController.updateAssistant)

// DELETE
router.delete(['/', '/:id'], checkPermission('assistants:delete'), assistantsController.deleteAssistant)

router.get('/components/chatmodels', assistantsController.getChatModels)
router.get('/components/docstores', assistantsController.getDocumentStores)
router.get('/components/tools', assistantsController.getTools)

// Generate Assistant Instruction
router.post('/generate/instruction', assistantsController.generateAssistantInstruction)

export default router
