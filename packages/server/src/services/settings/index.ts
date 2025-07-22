// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()

        const brandingLogo = await appServer.AppDataSource.getRepository(Variable).findOne({
            where: { name: 'BRANDING_LOGO' }
        })

        const baseSettings = { BRANDING_LOGO: brandingLogo?.value }

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    return {}
                } else {
                    return { ...baseSettings, PLATFORM_TYPE: Platform.ENTERPRISE }
                }
            }
            case Platform.CLOUD: {
                return { ...baseSettings, PLATFORM_TYPE: Platform.CLOUD }
            }
            default: {
                return { ...baseSettings, PLATFORM_TYPE: Platform.OPEN_SOURCE }
            }
        }
    } catch (error) {
        return {}
    }
}

export default {
    getSettings
}
