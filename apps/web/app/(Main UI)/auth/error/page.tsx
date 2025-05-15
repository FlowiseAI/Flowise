import React, { Suspense } from 'react'
import Auth from '@ui/Auth'

export const metadata = {
    title: 'Authentication Error | Answer Agent'
}

const AuthenticationErrorPage = async ({ params }: any) => {
    return (
        <Suspense>
            <Auth {...params} />
        </Suspense>
    )
}

export default AuthenticationErrorPage
