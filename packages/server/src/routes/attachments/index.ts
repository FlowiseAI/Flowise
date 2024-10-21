import express from 'express'
import multer from 'multer'
import path from 'path'
import attachmentsController from '../../controllers/attachments'

const router = express.Router()

const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

// CREATE
router.post('/:chatflowId/:chatId', upload.array('files'), attachmentsController.createAttachment)

export default router
