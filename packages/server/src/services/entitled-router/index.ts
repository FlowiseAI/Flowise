import { IRouter, NextFunction, Request, RequestHandler, Response, Router as ExpressRouter } from 'express'
import { PathParams } from 'express-serve-static-core'
import { Entitlement } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'
import { authorize } from '../../enterprise/middleware/policy'
import { Logger } from 'winston'

export interface RegisteredRoute {
    method: string
    path: PathParams
    entitlements: Entitlement[]
    authenticationStrategies: AuthenticationStrategy[]
}

/**
 * Joins two PathParams into a single, normalized string path.
 * This handles the complexity of PathParams being a string, RegExp, or an array of either.
 * For logging and display, it converts all parts to a string representation.
 * @param base The base path (e.g., from `router.use()`).
 * @param sub The sub-path (e.g., from `router.get()`).
 * @returns A normalized string path.
 */
function joinPathParams(base: PathParams, sub: PathParams): string {
    const pathParamToString = (p: string | RegExp): string => (p instanceof RegExp ? `(regex: ${p.source})` : p)

    const baseParts = Array.isArray(base) ? base.map(pathParamToString) : [pathParamToString(base)]
    const subParts = Array.isArray(sub) ? sub.map(pathParamToString) : [pathParamToString(sub)]

    // For display purposes, we'll just use the first path if multiple are provided.
    const basePath = baseParts[0] || ''
    const subPath = subParts[0] || ''

    // Don't append the sub-path if it's just the root ('/').
    if (subPath === '/') {
        return basePath || '/'
    }

    // Join and normalize slashes.
    const combined = `${basePath}/${subPath}`
    return combined.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export class EntitledRouter {
    readonly router: IRouter
    private logger?: Logger
    private childRouters: { path: PathParams; router: EntitledRouter }[] = []
    private registeredRoutes: RegisteredRoute[] = []

    constructor(logger?: Logger) {
        this.logger = logger
        this.router = ExpressRouter()
    }

    public getRegisteredRoutes(): RegisteredRoute[] {
        const childRoutes = this.childRouters.flatMap(({ path: basePath, router: childRouter }) => {
            // Get the child's local routes and prepend the parent's base path.
            const localChildRoutes = childRouter.getLocalRegisteredRoutes()
            return localChildRoutes.map((route) => ({
                ...route,
                path: joinPathParams(basePath, route.path)
            }))
        })
        return [...this.getLocalRegisteredRoutes(), ...childRoutes]
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

    public getLocalRegisteredRoutes(): RegisteredRoute[] {
        return this.registeredRoutes
    }

    public get(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'get', path, entitlements, authenticationStrategies }
        this.registeredRoutes.push(routeInfo)
        this.router.get(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public post(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'post', path, entitlements, authenticationStrategies }
        this.registeredRoutes.push(routeInfo)
        this.router.post(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public put(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'put', path, entitlements, authenticationStrategies }
        this.registeredRoutes.push(routeInfo)
        this.router.put(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public delete(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'delete', path, entitlements, authenticationStrategies }
        this.registeredRoutes.push(routeInfo)
        this.router.delete(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public patch(
        path: PathParams,
        entitlements: Entitlement[],
        authenticationStrategies: AuthenticationStrategy[],
        ...handlers: RequestHandler[]
    ): void {
        const routeInfo: RegisteredRoute = { method: 'patch', path, entitlements, authenticationStrategies }
        this.registeredRoutes.push(routeInfo)
        this.router.patch(path, this.createPolicyMiddleware(routeInfo), ...handlers)
    }

    public getRouter(): IRouter {
        return this.router
    }

    public use(...args: any[]): this {
        // The path is the first string argument.
        const path = args.find((arg) => typeof arg === 'string') || '/'

        // Find all EntitledRouter instances in the arguments.
        const childEntitledRouters = args.filter((arg) => arg instanceof EntitledRouter)
        for (const childRouter of childEntitledRouters) {
            this.childRouters.push({ path, router: childRouter })
        }

        // Replace EntitledRouter instances with their underlying Express router for the actual .use() call.
        const expressArgs = args.map((arg) => (arg instanceof EntitledRouter ? arg.getRouter() : arg))
        this.router.use(...expressArgs)
        return this
    }
}

function Router(logger?: Logger) {
    return new EntitledRouter(logger)
}

export const entitled = { Router }
