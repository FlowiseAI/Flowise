import datasetController from '../../controllers/dataset'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// get all datasets
router.get('/', ['datasets:view'], datasetController.getAllDatasets)
// get new dataset
router.get(['/set', '/set/:id'], ['datasets:view'], datasetController.getDataset)
// Create new dataset
router.post(['/set', '/set/:id'], ['datasets:create'], datasetController.createDataset)
// Update dataset
router.put(['/set', '/set/:id'], ['datasets:update'], datasetController.updateDataset)
// Delete dataset via id
router.delete(['/set', '/set/:id'], ['datasets:delete'], datasetController.deleteDataset)

// Create new row in a given dataset
router.post(['/rows', '/rows/:id'], ['datasets:create'], datasetController.addDatasetRow)
// Update row for a dataset
router.put(['/rows', '/rows/:id'], ['datasets:update'], datasetController.updateDatasetRow)
// Delete dataset row via id
router.delete(['/rows', '/rows/:id'], ['datasets:delete'], datasetController.deleteDatasetRow)
// PATCH delete by ids
router.patch('/rows', ['datasets:delete'], datasetController.patchDeleteRows)

// Update row for a dataset
router.post(['/reorder', '/reorder'], ['datasets:update'], datasetController.reorderDatasetRow)

export default router.getRouter()
