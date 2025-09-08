import { Request, Response, NextFunction } from 'express'

const getPing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.status(200).set('Content-Type', 'text/plain').send('pong')
    } catch (error) {
        next(error)
    }
}

const headPing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.status(200).end()
    } catch (error) {
        next(error)
    }
}

export default {
    getPing,
    headPing
}
