import { IRouter, RequestHandler, Router as ExpressRouter } from 'express'

class EntitledRouter {
    private readonly router: IRouter

    constructor() {
        this.router = ExpressRouter()
    }

    public get(path: string | string[], entitlements: string[], ...handlers: RequestHandler[]): void {
        this.router.get(path, ...handlers)
    }

    public post(path: string | string[], entitlements: string[], ...handlers: RequestHandler[]): void {
        this.router.post(path, ...handlers)
    }

    public put(path: string | string[], entitlements: string[], ...handlers: RequestHandler[]): void {
        this.router.put(path, ...handlers)
    }

    public delete(path: string | string[], entitlements: string[], ...handlers: RequestHandler[]): void {
        this.router.delete(path, ...handlers)
    }

    public patch(path: string | string[], entitlements: string[], ...handlers: RequestHandler[]): void {
        this.router.patch(path, ...handlers)
    }

    public getRouter(): IRouter {
        return this.router
    }
}

function Router() {
    return new EntitledRouter()
}

export const entitled = { Router }
