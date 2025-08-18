import React from 'react'
import getCachedSession from '@ui/getCachedSession'
import Profile from '@ui/Profile/Profile'

export const metadata = {
    title: 'Profile | Answer Agent',
    description: 'View and manage your profile information'
}

const ProfilePage = async () => {
    const session = await getCachedSession()

    if (!session?.user) {
        return (
            <div>
                <h1>Please log in to view your profile</h1>
            </div>
        )
    }

    // Extract only the plain user data we need
    const userData = {
        picture: session.user.picture,
        email: session.user.email,
        name: session.user.name,
        org_name: session.user.org_name,
        org_id: session.user.org_id,
        roles: session.user.roles,
        subscription: session.user.subscription
    }

    // Ensure the data is serializable
    const serializedUserData = JSON.parse(JSON.stringify(userData))

    return <Profile userData={serializedUserData} />
}

export default ProfilePage
