import { AppSettings } from 'types'
import ConfluenceSettingsClient from './ConfluenceSettings.Client'
export interface ConfluenceSettingsProps {
    appSettings: AppSettings
}
export const ConfluenceSettings = (props: ConfluenceSettingsProps) => {
    return <ConfluenceSettingsClient {...props} />
}

export default ConfluenceSettings
