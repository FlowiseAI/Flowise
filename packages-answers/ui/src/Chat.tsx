import { Suspense } from 'react'

import { getAppSettings } from './getAppSettings'
import { AnswersProvider } from './AnswersContext'
import getCachedSession from './getCachedSession'
import dynamic from 'next/dynamic'
import type { Sidekick, Chat as ChatType, Journey } from 'types'

const ChatDetail = dynamic(() => import('./ChatDetail').then((mod) => ({ default: mod.ChatDetail })))
const Modal = dynamic(() => import('./Modal'))
export interface Params {
    chat?: ChatType
    journey?: Journey
    sidekicks?: Sidekick[]
}

const Chat = async ({ chat, journey, sidekicks }: Params) => {
    const appSettingsPromise = getAppSettings()
    const sessionPromise = getCachedSession()

    const [session, appSettings] = await Promise.all([sessionPromise, appSettingsPromise])

    return (
        <AnswersProvider user={session?.user!} sidekicks={sidekicks} appSettings={appSettings} chat={chat} journey={journey}>
            <Suspense fallback={<div>Loading...</div>}>
                <Modal />
            </Suspense>
            <Suspense fallback={<div>Loading...</div>}>
                <ChatDetail appSettings={appSettings} sidekicks={sidekicks} session={JSON.parse(JSON.stringify(session))} />
            </Suspense>
        </AnswersProvider>
    )
}

export default Chat
