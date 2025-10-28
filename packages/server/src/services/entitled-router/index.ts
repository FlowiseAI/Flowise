import { IRouter, NextFunction, Request, RequestHandler, Response, Router as ExpressRouter } from 'express'
import { PathParams } from 'express-serve-static-core'
import { Entitlement } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'
import { authorize } from '../../enterprise/middleware/policy'

export interface RegisteredRoute {
    method: string
    path: PathParams
    entitlements: Entitlement[]
    authenticationStrategies: AuthenticationStrategy[]
}

class EntitledRouter {
    readonly router: IRouter

    constructor() {
        this.router = ExpressRouter()
    }

    /**
     * Creates a policy enforcement middleware for a specific route.
     * This returned middleware will be the first to execute for the route,
     * ensuring the user is authorized before any other handlers are called.
     * @param policy The route's registration information, including entitlements and auth strategies.
     * @returns A request handler that enforces the policy.
     */
    protected createPolicyMiddleware(policy: RegisteredRoute): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            // The authorize function contains the logic to check the user against the policy.
            return authorize(req.user, policy, res, next)
        }
    }

    public get(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'get', path, entitlements, authenticationStrategies }
        this.router.get(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public post(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'post', path, entitlements, authenticationStrategies }
        this.router.post(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public put(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'put', path, entitlements, authenticationStrategies }
        this.router.put(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public delete(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'delete', path, entitlements, authenticationStrategies }
        this.router.delete(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public patch(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'patch', path, entitlements, authenticationStrategies }
        this.router.patch(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public getRouter(): IRouter {
        return this.router
    }

    public use(...args: any[]): this {
        const patchedArgs = args.map((arg) => {
            if (arg instanceof EntitledRouter) {
                return arg.getRouter()
            }
            return arg
        })
        this.router.use(...patchedArgs)
        return this
    }
}

function Router() {
    return new EntitledRouter()
}

export const entitled = { Router }
