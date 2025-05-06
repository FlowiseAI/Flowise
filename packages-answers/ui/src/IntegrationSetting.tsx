import JiraSettings from './JiraSettings'
import SlackSettings from './SlackSettings'
import ConfluenceSettings from './ConfluenceSettings'

const SETTINGS: { [key: string]: any } = {
    jira: JiraSettings,
    slack: SlackSettings,
    confluence: ConfluenceSettings
}

const IntegrationSettings = ({ app, appSettings, editable }: any) => {
    const Component = SETTINGS[app]

    if (!Component && app)
        return <div>We are working hard to bring support for {app}. Subscribe to the newsletter to hear when this integration is ready</div>
    if (Component) return <Component appSettings={appSettings} editable={editable} />

    return null
}

export default IntegrationSettings
