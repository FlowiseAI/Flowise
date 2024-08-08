'use client'

import { useAnswers } from '../AnswersContext'
import SourcesToolbar from '../SourcesToolbar'

import { AppSettings } from 'types'

export interface DrawerFiltersProps {
    appSettings: AppSettings
}

export default function DrawerFilters({ appSettings }: DrawerFiltersProps) {
    const { showFilters, setShowFilters } = useAnswers()

    return (
        <>
            <SourcesToolbar appSettings={appSettings} />
        </>
    )
}
