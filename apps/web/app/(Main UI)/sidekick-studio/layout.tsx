import Auth0 from '@utils/auth/auth0'
import getCachedSession from '@ui/getCachedSession'
import AppProvider from 'flowise-ui/src/AppProvider'

const StudioLayout = async ({ children }: { children: React.ReactElement }) => {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain

    return (
        <AppProvider apiHost={apiHost} accessToken={session?.accessToken}>
            {children}
        </AppProvider>
    )
}

export default StudioLayout
