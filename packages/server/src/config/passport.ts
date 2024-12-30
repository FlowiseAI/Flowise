import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

export default function (passport: any) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID ?? '',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
                callbackURL: '/api/v1/auth/google/callback',
                proxy: true
            },
            async (accessToken, refreshToken, profile, done) => {
                const newCredential = {
                    fullName: profile.displayName,
                    email: profile.emails?.[0]?.value ?? '',
                    provider: profile.provider,
                    providerId: profile.id,
                    googleAccessToken: accessToken
                }
                try {
                    done(null, newCredential)
                } catch (err) {
                    console.error('Passport Error:', err)
                    done(err, undefined)
                }
            }
        )
    )

    passport.serializeUser((user: any, done: any) => {
        done(null, user)
    })

    passport.deserializeUser((user: any, done: any) => {
        done(null, user)
    })
}
