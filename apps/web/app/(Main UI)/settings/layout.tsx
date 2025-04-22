import { getAppSettings } from '@ui/getAppSettings'
import React from 'react'

import SettingsDrawer from '@ui/SettingsDrawer'

const SettingsLayout = async ({ children, params }: any) => {
    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <SettingsDrawer />
            <main style={{ width: '100%', overflow: 'auto', height: '100%', minHeight: '100vh' }}>{React.cloneElement(children)}</main>
        </div>
    )
}

export default SettingsLayout
