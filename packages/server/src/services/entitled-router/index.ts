import { IRouter, RequestHandler, Router as ExpressRouter } from 'express'
import { PathParams } from 'express-serve-static-core'
import { Entitlement } from '../../enterprise/rbac/Entitlements'

export interface RegisteredRoute {
    method: string
    path: PathParams
    entitlements: Entitlement[]
}

class EntitledRouter {
    readonly router: IRouter
    readonly registeredRoutes: RegisteredRoute[] = []
    readonly childRouters: EntitledRouter[] = []

    constructor() {
        this.router = ExpressRouter()
    }

    public get(path: PathParams, entitlements: Entitlement[], ...handlers: RequestHandler[]): void {
        this.registeredRoutes.push({ method: 'get', path, entitlements })
        this.router.get(path, ...handlers)
    }

    public post(path: PathParams, entitlements: Entitlement[], ...handlers: RequestHandler[]): void {
        this.registeredRoutes.push({ method: 'post', path, entitlements })
        this.router.post(path, ...handlers)
    }

    public put(path: PathParams, entitlements: Entitlement[], ...handlers: RequestHandler[]): void {
        this.registeredRoutes.push({ method: 'put', path, entitlements })
        this.router.put(path, ...handlers)
    }

    public delete(path: PathParams, entitlements: Entitlement[], ...handlers: RequestHandler[]): void {
        this.registeredRoutes.push({ method: 'delete', path, entitlements })
        this.router.delete(path, ...handlers)
    }

    public patch(path: PathParams, entitlements: Entitlement[], ...handlers: RequestHandler[]): void {
        this.registeredRoutes.push({ method: 'patch', path, entitlements })
        this.router.patch(path, ...handlers)
    }

    public getRouter(): IRouter {
        return this.router
    }

    public entitlementSearch() {
        // Recursively collect all registered routes from this and child routers
        const collectRoutes = (router: EntitledRouter): RegisteredRoute[] => {
            let routes = [...router.registeredRoutes]
            for (const child of router.childRouters) {
                routes = routes.concat(collectRoutes(child))
            }
            return routes
        }
        const routes = collectRoutes(this)
        return (entitlement: Entitlement) => routes.filter((route) => route.entitlements.includes(entitlement))
    }

    public use(...args: any[]): this {
        // Replace any EntitledRouter in args with its .getRouter(), and track as child
        const patchedArgs = args.map((arg) => {
            if (arg instanceof EntitledRouter) {
                this.childRouters.push(arg)
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
