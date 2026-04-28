// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    return {}
                } else {
                    return { PLATFORM_TYPE: Platform.ENTERPRISE }
                }
            }
            case Platform.CLOUD: {
                return { PLATFORM_TYPE: Platform.CLOUD }
            }
            default: {
                return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
            }
        }
    } catch (error) {
        return {}
    }
}

export default {
    getSettings
}
