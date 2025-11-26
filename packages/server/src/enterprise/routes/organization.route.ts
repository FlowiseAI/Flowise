import express from 'express'
import { OrganizationController } from '../controllers/organization.controller'

const router = express.Router()
const organizationController = new OrganizationController()

router.get('/', organizationController.read)

router.post('/', organizationController.create)

router.put('/', organizationController.update)

router.get('/additional-seats-quantity', organizationController.getAdditionalSeatsQuantity)

router.get('/customer-default-source', organizationController.getCustomerWithDefaultSource)

router.get('/additional-seats-proration', organizationController.getAdditionalSeatsProration)

router.post('/update-additional-seats', organizationController.updateAdditionalSeats)

router.get('/plan-proration', organizationController.getPlanProration)

router.post('/update-subscription-plan', organizationController.updateSubscriptionPlan)

router.get('/get-current-usage', organizationController.getCurrentUsage)

export default router
