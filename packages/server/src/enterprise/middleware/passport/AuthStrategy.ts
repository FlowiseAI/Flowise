import { JwtFromRequestFunction, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt'
import { decryptToken } from '../../utils/tempTokenUtils'
import { Strategy } from 'passport'
import { Request } from 'express'
import { ICommonObject } from 'flowise-components'

const _cookieExtractor = (req: any) => {
    let jwt = null

    if (req && req.cookies) {
        jwt = req.cookies['token']
    }

    return jwt
}

export const getAuthStrategy = (options: any): Strategy => {
    let jwtFromRequest: JwtFromRequestFunction
    jwtFromRequest = _cookieExtractor
    const jwtOptions = {
        jwtFromRequest: jwtFromRequest,
        passReqToCallback: true,
        ...options
    }
    const jwtVerify = async (req: Request, payload: ICommonObject, done: VerifiedCallback) => {
        try {
            if (!req.user) {
                return done(null, false, 'Unauthorized.')
            }
            const meta = decryptToken(payload.meta)
            if (!meta) {
                return done(null, false, 'Unauthorized.')
            }
            const ids = meta.split(':')
            if (ids.length !== 2 || req.user.id !== ids[0]) {
                return done(null, false, 'Unauthorized.')
            }
            done(null, req.user)
        } catch (error) {
            done(error, false)
        }
    }
    return new JwtStrategy(jwtOptions, jwtVerify)
}
