import exportImportController from '../../controllers/export-import'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

router.post('/export', ['workspace:export'], exportImportController.exportData)

router.post('/import', ['workspace:import'], exportImportController.importData)

export default router.getRouter()
