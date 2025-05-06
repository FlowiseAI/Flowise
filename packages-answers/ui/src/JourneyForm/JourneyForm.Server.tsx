import JourneyFormClient from './JourneyForm.Client'

import { AppSettings, User, Journey } from 'types'

const JourneyForm = (props: { appSettings: AppSettings; user: User; journey?: Journey }) => {
    return <JourneyFormClient {...props} />
}

export default JourneyForm
