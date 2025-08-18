import { AuthOptions, DefaultSession, TokenSet } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GithubProvider from 'next-auth/providers/github'
import AtlassianProvider from 'next-auth/providers/atlassian'
import SlackProvider from 'next-auth/providers/slack'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@db/client'
import { inngest } from '@utils/ingest/client'
import { User as AnswersUser, AppSettings, ContextField, Organization } from 'types'
export const USER_EVENTS = ['signIn', 'signOut', 'createUser', 'updateUser', 'linkAccount']

declare module 'next-auth' {
    interface User extends AnswersUser {}

    interface Session extends DefaultSession {
        user?: AnswersUser
        error?: 'RefreshAccessTokenError'
    }
}
// declare module 'next-auth/jwt' {
//   interface JWT {
//     id: string;
//     access_token: string;
//     expires_at: number;
//     refresh_token: string;
//     error?: 'RefreshAccessTokenError';
//   }
// }

const ATLASSIAN_SCOPE = {
    // 'write:jira-work': true,
    'read:jira-work': true,
    offline_access: true,
    'read:confluence-content.all': true,
    'read:confluence-content.summary': true,
    'read:confluence-content': true,
    'read:confluence-groups': true,
    'read:confluence-props': true,
    'read:confluence-space.summary': true,
    'read:confluence-user': true,
    'read:jira-user': true,
    'read:me': true,
    'read:oauth-provider': true,
    'read:page:confluence': true,
    'read:space:confluence': true
}

export const authOptions: AuthOptions = {
    cookies: {
        sessionToken: {
            // name:
            //   process.env.NODE_ENV === 'production'
            //     ? `__Secure-next-auth.session-token`
            //     : `next-auth.session-token`,
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'None',
                path: '/',
                secure: true
            }
        }
    },
    session: {
        strategy: 'jwt',
        // strategy: 'database',
        // Seconds - How long until an idle session expires and is no longer valid.
        maxAge: 30 * 24 * 60 * 60, // 30 days
        // Seconds - Throttle how frequently to write to database to extend a session.
        // Use it to limit write operations. Set to 0 to always update the database.
        // Note: This option is ignored if using JSON Web Tokens
        updateAge: 24 * 60 * 60 // 24 hours
    },
    adapter: PrismaAdapter(prisma),
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id!
            }

            refresAccessToken({ token, user, account })
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                const user = await prisma.user.findFirst({
                    where: { id: token.id as any },
                    include: {
                        contextFields: true,
                        currentOrganization: { include: { contextFields: true } }
                    }
                })

                if (!user) throw new Error('User not found')
                session.user.id = user.id!
                session.user.role = user.role!
                session.user.organizationId = user.organizationId!
                // @ts-ignore-next-line
                session.user.invited = user.invited ? new Date(user.invited as string) : user.invited
                session.user.appSettings = user?.appSettings as AppSettings
                session.user.contextFields = user?.contextFields ?? ([] as ContextField[])
                session.user.currentOrganization = user?.currentOrganization as Organization
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            let finalUrl = baseUrl
            try {
                // Allows relative callback URLs
                if (url.startsWith('/')) url = `${baseUrl}${url}`
                // Allows callback URLs on the same origin
                if (new URL(url).origin === baseUrl) finalUrl = url
            } catch (err) {
                console.log('Redirect error', { err, url, baseUrl })
            }
            return finalUrl
        }
    },
    providers: [
        SlackProvider({
            clientId: process.env.SLACK_CLIENT_ID!,
            clientSecret: process.env.SLACK_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    // scope: 'openid email profile channels:read groups:read mpim:read im:read'
                    scope: 'openid email profile'
                }
            }
        }),
        AtlassianProvider({
            clientId: process.env.ATLASSIAN_CLIENT_ID!,
            clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: Object.keys(ATLASSIAN_SCOPE).join(' ')
                }
            },
            allowDangerousEmailAccountLinking: true
        }),
        CredentialsProvider({
            id: 'app-widget',
            name: 'API Key',
            credentials: {
                apiKey: { label: 'API Key', type: 'text' }
            },
            async authorize(credentials, req) {
                let chatApp
                try {
                    const apiKey = credentials?.apiKey

                    if (!apiKey) {
                        throw new Error('Missing API Key')
                    }

                    // Find the ChatApp with the provided apiKey
                    chatApp = await prisma.chatApp.findUnique({
                        where: { apiKey },
                        include: {
                            user: true
                        }
                    })

                    if (!chatApp?.user) {
                        throw new Error('Invalid API Key')
                    }

                    return chatApp?.user! as AnswersUser
                } catch (e) {
                    console.log(e)
                    // throw e;
                }
                return null
                // Return a user object with the necessary fields
            }
        }),
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            allowDangerousEmailAccountLinking: true
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true
        })
    ],

    events: USER_EVENTS.reduce(
        (acc, event) => ({
            ...acc,
            [event]: async (payload: any) => {
                inngest.send(`auth/user.${event}`, {
                    ts: new Date().valueOf(),
                    user: payload.user,
                    data: payload
                })
            }
        }),
        {}
    )
}
async function refresAccessToken({ token, account }: any) {
    // if (token?.atlassian_expires_at && token?.atlassian_expires_at * 1000 < Date.now()) {
    const [atlassian] = await prisma.account.findMany({
        where: { userId: token.id, provider: 'atlassian' }
    })
    // If the access token has expired, try to refresh it
    if (atlassian?.expires_at && atlassian?.expires_at * 1000 < Date.now()) {
        // If the access token has expired, try to refresh it
        try {
            // https://accounts.atlassian.com/.well-known/openid-configuration
            // We need the `token_endpoint`.
            const response = await fetch('https://auth.atlassian.com/oauth/token', {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.ATLASSIAN_CLIENT_ID!,
                    client_secret: process.env.ATLASSIAN_CLIENT_SECRET!,
                    grant_type: 'refresh_token',
                    refresh_token: atlassian.refresh_token!
                }),
                method: 'POST'
            })

            const tokens: TokenSet = await response.json()

            if (!response.ok) throw tokens

            await prisma.account.update({
                data: {
                    access_token: tokens.access_token,
                    expires_at: Math.floor(Date.now() / 1000 + (tokens.expires_in as number)),
                    refresh_token: tokens.refresh_token ?? atlassian.refresh_token
                },
                where: {
                    provider_providerAccountId: {
                        provider: 'atlassian',
                        providerAccountId: atlassian.providerAccountId
                    }
                }
            })
        } catch (error) {
            // Not using atlassian so commenting out for now.
            // console.error('Error refreshing access token', error);
            // The error property will be used client-side to handle the refresh token error
            // session.error = 'RefreshAccessTokenError';
        }
    }
    // }
}
