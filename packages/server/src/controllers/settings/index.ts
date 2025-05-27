import { Request, Response, NextFunction } from 'express'
import settingsService from '../../services/settings'

const getSettingsList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await settingsService.getSettings()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getSettingsList
}
