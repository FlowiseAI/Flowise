'use client'
import React from 'react'

import { Sidekick, AppSettings } from 'types'

const SidekickFormLayout = ({
    appSettings,
    children,
    sidekicks
}: {
    appSettings: AppSettings
    children: React.ReactNode
    sidekicks: Sidekick[]
}) => {
    return (
        <main style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* <SidekickStudioDrawer sidekicks={sidekicks} /> */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>{children}</div>
        </main>
    )
}

export default SidekickFormLayout
