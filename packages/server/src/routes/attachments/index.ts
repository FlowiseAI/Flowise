import express from 'express'
import multer from 'multer'
import attachmentsController from '../../controllers/attachments'
import { getUploadPath } from '../../utils'

const router = express.Router()

const upload = multer({ dest: getUploadPath() })

// CREATE
router.post('/:chatflowId/:chatId', upload.array('files'), attachmentsController.createAttachment)

export default router
