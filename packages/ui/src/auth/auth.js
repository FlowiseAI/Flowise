import GithubProvider from 'next-auth/providers/github'
export const authOptions = {
    // Configure one or more authentication providers
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
        })
        // ...add more providers here
    ]
}
