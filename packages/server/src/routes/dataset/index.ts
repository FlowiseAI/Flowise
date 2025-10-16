import datasetController from '../../controllers/dataset'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// get all datasets
router.get('/', [Entitlements.datasets.view], datasetController.getAllDatasets)
// get new dataset
router.get(['/set', '/set/:id'], [Entitlements.datasets.view], datasetController.getDataset)
// Create new dataset
router.post(['/set', '/set/:id'], [Entitlements.datasets.create], datasetController.createDataset)
// Update dataset
router.put(['/set', '/set/:id'], [Entitlements.datasets.update], datasetController.updateDataset)
// Delete dataset via id
router.delete(['/set', '/set/:id'], [Entitlements.datasets.delete], datasetController.deleteDataset)

// Create new row in a given dataset
router.post(['/rows', '/rows/:id'], [Entitlements.datasets.create], datasetController.addDatasetRow)
// Update row for a dataset
router.put(['/rows', '/rows/:id'], [Entitlements.datasets.update], datasetController.updateDatasetRow)
// Delete dataset row via id
router.delete(['/rows', '/rows/:id'], [Entitlements.datasets.delete], datasetController.deleteDatasetRow)
// PATCH delete by ids
router.patch('/rows', [Entitlements.datasets.delete], datasetController.patchDeleteRows)

// Update row for a dataset
router.post(['/reorder', '/reorder'], [Entitlements.datasets.update], datasetController.reorderDatasetRow)

export default router
