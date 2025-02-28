import Auth0 from '@utils/auth/auth0'
import getCachedSession from '@ui/getCachedSession'
import AppLayout from 'flowise-ui/src/AppLayout'

const StudioLayout = async ({ children }: { children: React.ReactElement }) => {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain

    return (
        <AppLayout apiHost={apiHost} accessToken={session?.accessToken}>
            {children}
        </AppLayout>
    )
}

export default StudioLayout
