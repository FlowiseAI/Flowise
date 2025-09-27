// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSettings = async () => {
    // 开发模式：直接返回企业版
    console.log('Settings API: Development mode - forcing enterprise platform')
    return { PLATFORM_TYPE: Platform.ENTERPRISE }
    
    /* 原始逻辑（已注释用于开发测试）
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()
        const isLicenseValid = appServer.identityManager.isLicenseValid()
        
        console.log('Settings API Debug - platformType:', platformType, 'isLicenseValid:', isLicenseValid)

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    console.log('Settings API: Enterprise platform but license invalid, returning empty object')
                    return {}
                } else {
                    console.log('Settings API: Enterprise platform with valid license')
                    return { PLATFORM_TYPE: Platform.ENTERPRISE }
                }
            }
            case Platform.CLOUD: {
                console.log('Settings API: Cloud platform')
                return { PLATFORM_TYPE: Platform.CLOUD }
            }
            default: {
                console.log('Settings API: Default to open source platform')
                return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
            }
        }
    } catch (error) {
        console.log('Settings API Error:', error)
        return {}
    }
    */
}

export default {
    getSettings
}
