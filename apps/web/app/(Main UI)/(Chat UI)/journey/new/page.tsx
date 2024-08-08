import { getAppSettings } from '@ui/getAppSettings'
import React from 'react'
import JourneyForm from '@ui/JourneyForm'

import getCachedSession from '@ui/getCachedSession'

const NewJourneyPage = async ({}: any) => {
    const appSettings = await getAppSettings()
    const session = await getCachedSession()

    return (
        <>
            <JourneyForm user={session?.user!} appSettings={appSettings}></JourneyForm>
        </>
    )
}

export default NewJourneyPage
