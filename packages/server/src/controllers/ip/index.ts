import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

// Configure number of proxies in Host Environment
const configureProxyNrInHostEnv = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.ip === 'undefined' || req.ip) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: ipController.configureProxyNrInHostEnv - ip not provided!`
            )
        }
        const apiResponse = {
            ip: req.ip,
            msg: `Check returned IP address in the response. If it matches your current IP address ( which you can get by going to http://ip.nfriedly.com/ or https://api.ipify.org/ ), then the number of proxies is correct and the rate limiter should now work correctly. If not, increase the number of proxies by 1 and restart Cloud-Hosted Flowise until the IP address matches your own. Visit https://docs.flowiseai.com/configuration/rate-limit#cloud-hosted-rate-limit-setup-guide for more information.`
        }
        return res.send(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    configureProxyNrInHostEnv
}
