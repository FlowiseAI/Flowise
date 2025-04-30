'use client'
import React from 'react'
import SourcesBasicDocument from './SourcesBasicDocument'

const SourcesYoutube: React.FC<{}> = () => {
    return <SourcesBasicDocument source='youtube' label='Choose youtube' placeholder={`Youtube video`} />
}

export default SourcesYoutube
