import express from 'express'
import historyController from '../../controllers/history'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// GET specific snapshot by ID
router.get('/snapshot/:historyId', checkAnyPermission('chatflows:view,assistants:view'), historyController.getSnapshotById)

// GET comparison between two snapshots
router.get(
    '/compare/:historyId1/:historyId2',
    checkAnyPermission('chatflows:view,assistants:view'),
    historyController.getSnapshotComparison
)

// POST restore from history snapshot
router.post('/restore/:historyId', checkAnyPermission('chatflows:update,assistants:update'), historyController.restoreSnapshot)

// DELETE history snapshot
router.delete('/snapshot/:historyId', checkAnyPermission('chatflows:delete,assistants:delete'), historyController.deleteSnapshot)

// GET history for an entity
router.get('/:entityType/:entityId', checkAnyPermission('chatflows:view,assistants:view'), historyController.getHistory)

export default router
