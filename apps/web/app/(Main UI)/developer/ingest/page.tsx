import AppSyncToolbar from '@ui/AppSyncToolbar'
import React from 'react'
import { getAppSettings } from '@ui/getAppSettings'

export const metadata = {
    title: 'Events | Answer Agents'
}

const INNGEST_SERVER_URL = process.env.INNGEST_SERVER_URL || 'http://localhost:8288'

const Inngest = async () => {
    const appSettings = await getAppSettings()
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <AppSyncToolbar appSettings={appSettings} />
                <iframe src={INNGEST_SERVER_URL} width='100%' height='100%' style={{ border: 'none' }} />
            </div>
        </>
    )
}
export default Inngest
