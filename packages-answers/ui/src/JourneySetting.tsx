import SourcesAirtable from './SourcesAirtable'
import SourcesConfluence from './SourcesConfluence'
import SourcesCodebase from './SourcesCodebase'
import SourcesFile from './SourcesFile'
import SourcesJira from './SourcesJira'
import SourcesSlack from './SourcesSlack'
import SourcesWeb from './SourcesWeb'
import SourcesYoutube from './SourcesYoutube'
import SourcesDocument from './SourcesDocument'
import SourcesZoom from './SourcesZoom'

const JOURNEY_SETTINGS: { [key: string]: any } = {
    airtable: SourcesAirtable,
    confluence: SourcesConfluence,
    codebase: SourcesCodebase,
    file: SourcesFile,
    jira: SourcesJira,
    slack: SourcesSlack,
    web: SourcesWeb,
    document: SourcesDocument,
    zoom: SourcesZoom,
    youtube: SourcesYoutube
}

const JourneySettings = ({ app, ...other }: any) => {
    const Component = JOURNEY_SETTINGS[app]
    if (!Component && app) return <div>There are currently no filters available for {app}.</div>
    if (Component) return <Component {...other} />

    return null
}

export default JourneySettings
