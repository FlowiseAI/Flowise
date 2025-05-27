import express from 'express'
import datasetController from '../../controllers/dataset'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// get all datasets
router.get('/', checkPermission('datasets:view'), datasetController.getAllDatasets)
// get new dataset
router.get(['/set', '/set/:id'], checkPermission('datasets:view'), datasetController.getDataset)
// Create new dataset
router.post(['/set', '/set/:id'], checkPermission('datasets:create'), datasetController.createDataset)
// Update dataset
router.put(['/set', '/set/:id'], checkAnyPermission('datasets:create,datasets:update'), datasetController.updateDataset)
// Delete dataset via id
router.delete(['/set', '/set/:id'], checkPermission('datasets:delete'), datasetController.deleteDataset)

// Create new row in a given dataset
router.post(['/rows', '/rows/:id'], checkPermission('datasets:create'), datasetController.addDatasetRow)
// Update row for a dataset
router.put(['/rows', '/rows/:id'], checkAnyPermission('datasets:create,datasets:update'), datasetController.updateDatasetRow)
// Delete dataset row via id
router.delete(['/rows', '/rows/:id'], checkPermission('datasets:delete'), datasetController.deleteDatasetRow)
// PATCH delete by ids
router.patch('/rows', checkPermission('datasets:delete'), datasetController.patchDeleteRows)

// Update row for a dataset
router.post(['/reorder', '/reorder'], checkAnyPermission('datasets:create,datasets:update'), datasetController.reorderDatasetRow)

export default router
