// app/api/auth/[auth0]/route.js
import { HandlerError, handleAuth } from '@auth0/nextjs-auth0'
import { NextApiRequest, NextApiResponse } from 'next'
import { redirect } from 'next/navigation'
import Auth0 from '@utils/auth/auth0'

// Debug logging helper with safety
const debugLog = (message: string, data?: any) => {
    if (process.env.AUTH0_DEBUG === 'true' || process.env.DEBUG === 'true') {
        let dataStr = ''
        if (data) {
            try {
                dataStr = JSON.stringify(data, null, 2)
            } catch {
                dataStr = String(data)
            }
        }
        console.log('🔐 AUTH0 ROUTE DEBUG:', message, dataStr)
    }
}

export const GET = Auth0.handleAuth({
    onError(req: Request, error: Error) {
        // Always log basic error
        console.error('❌ AUTH0 ERROR:', error.message)

        // Enhanced debugging
        debugLog('Auth0 error occurred', {
            message: error.message,
            name: error.name,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        })

        // Detailed debug info only when enabled
        if (process.env.AUTH0_DEBUG === 'true' || process.env.DEBUG === 'true') {
            console.error('❌ DEBUG ERROR DETAILS:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                url: req.url,
                headers: Object.fromEntries(req.headers.entries())
            })
        }

        return redirect('/auth/error?error=' + encodeURIComponent(error.message))
    }
})
