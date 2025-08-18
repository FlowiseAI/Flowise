import React from 'react'
import getCachedSession from '@ui/getCachedSession'
import OrgCredentialsManager from '@ui/OrgCredentials/OrgCredentialsManager'

export const metadata = {
    title: 'Org Credentials | Answer Agent',
    description: 'Manage organization credential integrations'
}

const OrgCredentialsPage = async () => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return null
    }

    // Check if user is admin
    const isAdmin = Array.isArray(session.user?.roles) && session.user.roles.includes('Admin')

    if (!isAdmin) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You need admin privileges to manage organization credentials.</p>
            </div>
        )
    }

    return <OrgCredentialsManager />
}

export default OrgCredentialsPage
