import { getAppSettings } from '@ui/getAppSettings'
import React from 'react'

import { IntegrationsSettings } from '@ui/IntegrationsSettings'

const SettingsIntegrationsAppLayout = async ({ children, params, ...other }: any) => {
    const appSettings = await getAppSettings()

    const [activeApp] = params?.app || []
    return (
        <>
            <IntegrationsSettings appSettings={appSettings} activeApp={activeApp}></IntegrationsSettings>
            {React.cloneElement(children, { appSettings })}
        </>
    )
}

export default SettingsIntegrationsAppLayout
