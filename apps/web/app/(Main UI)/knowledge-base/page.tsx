import { getAppSettings } from '@ui/getAppSettings'
import React from 'react'
import SyncStatusLists from '@ui/SyncStatusLists'

export const metadata = {
    title: 'Document Sync Status | Answer Agent',
    description: 'Document Sync Status'
}

const DocumentSyncStatusPage = async ({ params }: any) => {
    const appSettings = await getAppSettings()
    return <SyncStatusLists {...params} appSettings={appSettings}></SyncStatusLists>
}

export default DocumentSyncStatusPage
