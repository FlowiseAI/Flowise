import { prisma } from '@db/client'
// import { Session } from 'next-auth/core/types';
import { syncAppSettings } from '../auth/syncAppSettings'

import { EventVersionHandler } from './EventVersionHandler'
import { inngest } from './client'

// export const USER_EVENTS = ['signIn', 'signOut', 'createUser', 'updateUser', 'linkAccount'];

export const authSession: EventVersionHandler<{
    user: { id: string }
}> = {
    v: '1',
    event: 'auth/settings.sync',
    handler: async ({ event }) => {
        const { user } = event
        if (!user) console.log('NO_USER_PROVIDED', event)
        else {
            // TODO: Sync only every X hours
            const settings = await syncAppSettings({ userId: user.id })
            return { settings }
        }
    }
}
export const syncAllSettings: EventVersionHandler<{}> = {
    v: '1',
    event: 'auth/settings.syncAll',
    handler: async ({ event }) => {
        const users = await prisma.user.findMany()

        const events = users?.map((user) => ({
            v: '1',
            ts: new Date().valueOf(),
            name: 'auth/settings.sync',
            user: { id: user.id },
            data: { user: { id: user.id } }
        }))

        await inngest.send(events)
    }
}

export const authUserSignIn: EventVersionHandler<{
    chatId: number
    role: string
    content: string
}> = {
    v: '1',
    event: 'auth/user.signIn',
    handler: async ({ event }) => {
        const { data, user } = event
        if (!user) throw new Error('NO_USER_PROVIDED')
        const settings = await syncAppSettings({ userId: user.id })
        return { settings }
    }
}
export const authUserLinkAccount: EventVersionHandler<{
    chatId: number
    role: string
    content: string
}> = {
    v: '1',
    event: 'auth/user.linkAccount',
    handler: async ({ event }) => {
        const { data, user } = event
        if (!user) throw new Error('NO_USER_PROVIDED')
        const settings = await syncAppSettings({ userId: user.id })
        return { settings }
    }
}

// export const authCreateUser: EventVersionHandler<{
//   chatId: number;
//   role: string;
//   content: string;
// }> = {
//   v: '1',
//   event: 'auth/user.createUser',
//   handler: async ({ event }) => {
//     const { data, user } = event;
//     if (!user) throw new Error('NO_USER_PROVIDED');
//     const settings = await syncAppSettings({ userId: user.id });
//     return { settings };
//   }
// };
