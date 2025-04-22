'use client'
import React from 'react'
import SourcesBasicDocument from './SourcesBasicDocument'

const SourcesZoom: React.FC<{}> = () => {
    return <SourcesBasicDocument source={'zoom'} label={'Choose transcript'} placeholder={`My zoom meeting`} />
}

export default SourcesZoom
