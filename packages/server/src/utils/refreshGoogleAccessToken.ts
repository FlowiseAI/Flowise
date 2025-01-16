import { google } from 'googleapis'

interface IGoogleOauth2 {
    googleAccessToken: string
    googleRefreshToken: string
}

export class GoogleOauth2Client {
    private oauth2Client: any
    constructor(credentials: IGoogleOauth2) {
        if (!credentials.googleRefreshToken) {
            throw new Error('Refresh token is required')
        }

        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        )

        this.oauth2Client.setCredentials({
            access_token: credentials.googleAccessToken,
            refresh_token: credentials.googleRefreshToken
        })
    }

    async refreshToken() {
        const { tokens } = await this.oauth2Client.refreshToken(this.oauth2Client.credentials.refresh_token)
        return tokens
    }
}
