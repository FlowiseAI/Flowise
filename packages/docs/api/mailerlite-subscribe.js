export default async function handler(req, res) {
    const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY
    const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID || process.env.NEXT_PUBLIC_MAILERLITE_WEBFORM_ID

    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' })
    }

    if (!MAILERLITE_API_KEY) {
        console.error('MailerLite API key not configured')
        return res.status(500).json({
            success: false,
            message: 'Subscription service is not configured properly'
        })
    }

    try {
        const body = req.body

        if (!body.email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            })
        }

        // Build the MailerLite API payload
        const payload = {
            email: body.email,
            status: 'active',
            fields: body.fields || {}
        }

        if (body.name) {
            payload.fields.name = body.name
        }

        if (body.resubscribe) {
            payload.resubscribe = true
        }

        // Add to groups if specified
        if (body.groups && body.groups.length > 0) {
            payload.groups = body.groups
        } else if (MAILERLITE_GROUP_ID) {
            // Use default group if no specific groups provided
            payload.groups = [MAILERLITE_GROUP_ID]
        }

        // Make request to MailerLite API
        const response = await fetch('https://api.mailerlite.com/api/v2/subscribers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-MailerLite-ApiKey': MAILERLITE_API_KEY
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            // Check if subscriber already exists (200/201 are success, 400 might be duplicate)
            if (response.status === 400 && data.message?.includes('already exists')) {
                // Try to update existing subscriber
                const updateResponse = await fetch(`https://api.mailerlite.com/api/v2/subscribers/${body.email}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-MailerLite-ApiKey': MAILERLITE_API_KEY
                    },
                    body: JSON.stringify(payload)
                })

                if (updateResponse.ok) {
                    const updateData = await updateResponse.json()
                    return res.status(200).json({
                        success: true,
                        message: 'Successfully updated your subscription',
                        alreadySubscribed: true,
                        data: updateData
                    })
                }
            }

            console.error('MailerLite API error:', data)
            return res.status(response.status).json({
                success: false,
                message: data.message || 'Failed to subscribe. Please try again.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Successfully subscribed!',
            alreadySubscribed: false,
            data: data
        })
    } catch (error) {
        console.error('Subscription error:', error)
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your subscription'
        })
    }
}
