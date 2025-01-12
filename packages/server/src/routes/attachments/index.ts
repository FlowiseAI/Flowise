import express from 'express'
import attachmentsController from '../../controllers/attachments'
import { getMulterStorage } from 'flowise-components'

const router = express.Router()
const multer = getMulterStorage()

// CREATE
router.post('/:chatflowId/:chatId', multer.array('files'), attachmentsController.createAttachment)

export default router
