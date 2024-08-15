import getCachedSession from '@ui/getCachedSession'
import AppProvider from 'flowise-ui/src/AppProvider'
import MinimalLayout from 'flowise-ui/src/layout/MinimalLayout'

const StudioLayout = async ({ children }) => {
    const { user } = await getCachedSession()
    return (
        <AppProvider user={user}>
            <MinimalLayout>{children}</MinimalLayout>
        </AppProvider>
    )
}

export default StudioLayout
