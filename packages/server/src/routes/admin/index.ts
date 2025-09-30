import express from 'express'
import chatflowsController from '../../controllers/chatflows'
import documentStoreController from '../../controllers/documentstore'
import organizationsController from '../../controllers/organizations'
import enforceAbility from '../../middlewares/authentication/enforceAbility'
const router = express.Router()

// CHATFLOWS
// READ
router.get('/chatflows', enforceAbility('ChatFlow'), chatflowsController.getAdminChatflows)
router.get('/chatflows/default-template', enforceAbility('ChatFlow'), chatflowsController.getDefaultChatflowTemplate)
router.get('/chatflows/:id/versions', enforceAbility('ChatFlow'), chatflowsController.getChatflowVersions)
// UPDATE
router.put('/chatflows/bulk-update', enforceAbility('ChatFlow'), chatflowsController.bulkUpdateChatflows)
router.post('/chatflows/:id/rollback/:version', enforceAbility('ChatFlow'), chatflowsController.rollbackChatflowToVersion)

// DOCUMENT STORES
// READ
router.get('/document-stores', enforceAbility('DocumentStore'), documentStoreController.getAdminDocumentStores)

// ORGANIZATIONS
// READ
router.get('/organizations/credentials', enforceAbility('Organization'), organizationsController.getOrganizationCredentials)

// UPDATE
router.put('/organizations/credentials', enforceAbility('Organization'), organizationsController.updateOrganizationCredentials)

export default router
