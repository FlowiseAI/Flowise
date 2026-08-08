import express from 'express'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
import upsertHistoryController from '../../controllers/upsert-history'
const router = express.Router()

// CREATE

// READ
router.get(['/', '/:id'], checkAnyPermission('chatflows:view,documentStores:view'), upsertHistoryController.getAllUpsertHistory)

// PATCH
router.patch('/', checkAnyPermission('chatflows:update,documentStores:upsert-config'), upsertHistoryController.patchDeleteUpsertHistory)

// DELETE

export default router
