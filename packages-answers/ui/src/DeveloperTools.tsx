import { AppSettings, Chat, Journey, User } from 'types'
import { ChatDetail } from './ChatDetail'

const DeveloperTools = ({
    appSettings,
    user,
    prompts,
    journeys,
    chats
}: {
    appSettings: AppSettings
    journeys?: Journey[]
    chats?: Chat[]
    user: User
    prompts?: any
}) => {
    return (
        <>
            <div
                style={{
                    display: 'flex',
                    height: '100%'
                }}
            >
                <ChatDetail appSettings={appSettings} prompts={prompts} />
            </div>
        </>
    )
}

export default DeveloperTools
