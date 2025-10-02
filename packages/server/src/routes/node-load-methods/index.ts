
import nodesRouter from '../../controllers/nodes';
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

router.post(['/', '/:name'], ['public'], nodesRouter.getSingleNodeAsyncOptions);

export default router.getRouter();
