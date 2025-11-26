import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { Platform } from '../../Interface'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { LoginMethod, LoginMethodStatus } from '../database/entities/login-method.entity'
import { LoginMethodErrorMessage, LoginMethodService } from '../services/login-method.service'
import { OrganizationService } from '../services/organization.service'
import Auth0SSO from '../sso/Auth0SSO'
import AzureSSO from '../sso/AzureSSO'
import GithubSSO from '../sso/GithubSSO'
import GoogleSSO from '../sso/GoogleSSO'
import { decrypt } from '../utils/encryption.util'

export class LoginMethodController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const loginMethodService = new LoginMethodService()
            const loginMethod = await loginMethodService.createLoginMethod(req.body)
            return res.status(StatusCodes.CREATED).json(loginMethod)
        } catch (error) {
            next(error)
        }
    }

    public async defaultMethods(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            let organizationId
            if (getRunningExpressApp().identityManager.getPlatformType() === Platform.CLOUD) {
                organizationId = undefined
            } else if (getRunningExpressApp().identityManager.getPlatformType() === Platform.ENTERPRISE) {
                const organizationService = new OrganizationService()
                const organizations = await organizationService.readOrganization(queryRunner)
                if (organizations.length > 0) {
                    organizationId = organizations[0].id
                } else {
                    return res.status(StatusCodes.OK).json({})
                }
            } else {
                return res.status(StatusCodes.OK).json({})
            }
            const loginMethodService = new LoginMethodService()

            const providers: string[] = []

            let loginMethod = await loginMethodService.readLoginMethodByOrganizationId(organizationId, queryRunner)
            if (loginMethod) {
                for (let method of loginMethod) {
                    if (method.status === LoginMethodStatus.ENABLE) providers.push(method.name)
                }
            }
            return res.status(StatusCodes.OK).json({ providers: providers })
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<LoginMethod>
            const loginMethodService = new LoginMethodService()

            const loginMethodConfig = {
                providers: [],
                callbacks: [
                    { providerName: 'azure', callbackURL: AzureSSO.getCallbackURL() },
                    { providerName: 'google', callbackURL: GoogleSSO.getCallbackURL() },
                    { providerName: 'auth0', callbackURL: Auth0SSO.getCallbackURL() },
                    { providerName: 'github', callbackURL: GithubSSO.getCallbackURL() }
                ]
            }
            let loginMethod: any
            if (query.id) {
                loginMethod = await loginMethodService.readLoginMethodById(query.id, queryRunner)
                if (!loginMethod) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, LoginMethodErrorMessage.LOGIN_METHOD_NOT_FOUND)
                loginMethod.config = JSON.parse(await decrypt(loginMethod.config))
            } else if (query.organizationId) {
                loginMethod = await loginMethodService.readLoginMethodByOrganizationId(query.organizationId, queryRunner)

                for (let method of loginMethod) {
                    method.config = JSON.parse(await decrypt(method.config))
                }
                loginMethodConfig.providers = loginMethod
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }
            return res.status(StatusCodes.OK).json(loginMethodConfig)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }
    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const loginMethodService = new LoginMethodService()
            const loginMethod = await loginMethodService.createOrUpdateConfig(req.body)
            if (loginMethod?.status === 'OK' && loginMethod?.organizationId) {
                const appServer = getRunningExpressApp()
                let providers: any[] = req.body.providers
                providers.map((provider: any) => {
                    const identityManager = appServer.identityManager
                    if (provider.config.clientID) {
                        provider.config.configEnabled = provider.status === LoginMethodStatus.ENABLE
                        identityManager.initializeSsoProvider(appServer.app, provider.providerName, provider.config)
                    }
                })
            }
            return res.status(StatusCodes.OK).json(loginMethod)
        } catch (error) {
            next(error)
        }
    }
    public async testConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const providers = req.body.providers
            if (req.body.providerName === 'azure') {
                const response = await AzureSSO.testSetup(providers[0].config)
                return res.json(response)
            } else if (req.body.providerName === 'google') {
                const response = await GoogleSSO.testSetup(providers[0].config)
                return res.json(response)
            } else if (req.body.providerName === 'auth0') {
                const response = await Auth0SSO.testSetup(providers[0].config)
                return res.json(response)
            } else if (req.body.providerName === 'github') {
                const response = await GithubSSO.testSetup(providers[0].config)
                return res.json(response)
            } else {
                return res.json({ error: 'Provider not supported' })
            }
        } catch (error) {
            next(error)
        }
    }
}
