import getCachedSession from '@ui/getCachedSession'
import AppProvider from 'flowise-ui/src/AppProvider'

const StudioLayout = async ({ children }: { children: React.ReactElement }) => {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain
    console.log('[StudioLayout] session:', session)
    console.log('[StudioLayout] apiHost:', apiHost)
    return <AppProvider apiHost={apiHost}>{children}</AppProvider>
}

export default StudioLayout
