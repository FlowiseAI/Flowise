import { IUser } from './Interface'

declare global {
    namespace Express {
        interface Request {
            io?: Server
            user?: IUser
            auth?: {
                payload: {
                    chatflowDomain: string
                    answersDomain: string
                    org_id: string
                    sub: string
                    email: string
                    name: string
                }
                token: string
            }
        }
    }
}
