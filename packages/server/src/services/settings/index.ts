// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Variable } from '../../database/entities/Variable'

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()

        const variableRepo = appServer.AppDataSource.getRepository(Variable)

        const brandingLogo = await variableRepo.findOne({
            where: { name: 'BRANDING_LOGO' }
        })
        const brandingFooterText = await variableRepo.findOne({
            where: { name: 'BRANDING_FOOTER_TEXT' }
        })
        const brandingFooterLink = await variableRepo.findOne({
            where: { name: 'BRANDING_FOOTER_LINK' }
        })

        const baseSettings = {
            BRANDING_LOGO: brandingLogo?.value,
            BRANDING_FOOTER_TEXT: brandingFooterText?.value,
            BRANDING_FOOTER_LINK: brandingFooterLink?.value
        }

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
