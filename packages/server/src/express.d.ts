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
                    org_name: string
                    sub: string
                    email: string
                    name: string
                    'https://theanswer.ai/roles'?: string[]
                    permissions?: string[]
                    stripeCustomerId?: string
                }
                token: string
            }
        }
        
        interface Response {
            locals: {
                filter?: {
                    userId?: string
                    organizationId: string
                }
            }
        }
    }
}
