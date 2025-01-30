import express, { Request, Response } from 'express'
import { ActionRequestController } from '../controllers/ActionRequestController'
import { validateActionRequestParams, validateUpdateActionRequest } from '../middlewares/actionRequest'

const router = express.Router()
const actionRequestController = new ActionRequestController()

// Get all action requests for a flow
router.get('/flow/:flowId', validateActionRequestParams, (req: Request, res: Response) => actionRequestController.getFlowActionRequests(req, res))

// Get action request by ID
router.get('/:actionId', validateActionRequestParams, (req: Request, res: Response) => actionRequestController.getActionRequest(req, res))

// Update action request
router.put('/:actionId', [validateActionRequestParams, validateUpdateActionRequest], (req: Request, res: Response) => actionRequestController.updateActionRequest(req, res))

// Get pending action requests for a session
router.get('/session/:sessionId/pending', validateActionRequestParams, (req: Request, res: Response) => actionRequestController.getSessionPendingRequests(req, res))

export default router 