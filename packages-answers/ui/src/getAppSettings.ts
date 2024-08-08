import React from 'react'
import { SYSTEM_SETTINGS } from '@utils/auth/SYSTEM_SETTINGS'

import { AppSettings } from 'types'
import getCachedSession from './getCachedSession'
import { deepmerge } from '@utils/deepmerge'

export const getAppSettings = React.cache(async function getAppSettings(req?: any, res?: any): Promise<AppSettings> {
    const session = await (req && res ? getCachedSession(req, res) : getCachedSession())

    let settings = SYSTEM_SETTINGS
    let orgSettings
    if (session?.user) {
        settings = session.user.appSettings as AppSettings
        orgSettings = session.user.currentOrganization?.appSettings
        settings = deepmerge({}, SYSTEM_SETTINGS, orgSettings ?? {}, session.user.appSettings)
        settings.chatflowDomain =
            session.user?.chatflowDomain ?? orgSettings?.chatflowDomain ?? settings.chatflowDomain ?? process.env.FLOWISE_DOMAIN
    }

    return settings
})
