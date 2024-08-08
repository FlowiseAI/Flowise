import Cors from 'cors'
import { NextApiRequest, NextApiResponse } from 'next'

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function initMiddleware(middleware: any) {
    return (req: NextApiRequest, res: NextApiResponse) =>
        new Promise((resolve, reject) => {
            middleware(req, res, (result: any) => {
                if (result instanceof Error) {
                    return reject(result)
                }
                return resolve(result)
            })
        })
}
// Initialize the cors middleware
const cors = initMiddleware(
    // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
    //@ts-ignore
    Cors({
        // Only allow requests with GET, POST and OPTIONS
        methods: ['GET', 'POST', 'OPTIONS']
    })
)

export default cors
