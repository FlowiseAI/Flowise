'use client'
import React from 'react'
import SourcesBasicDocument from './SourcesBasicDocument'

const SourcesFile: React.FC<{}> = () => {
    return <SourcesBasicDocument source={'file'} label={'Choose file'} placeholder={`My custom file`} />
}

export default SourcesFile
