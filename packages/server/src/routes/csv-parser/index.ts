import express from 'express'
import csvParserController from '../../controllers/csv-parser'

const router = express.Router()

router.get('/', csvParserController.getAllCsvParseRuns)
router.get('/:id', csvParserController.getCsvParseRunById)
router.post('/', csvParserController.createCsvParseRun)

export default router
