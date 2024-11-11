import FlowiseAppLayout from 'flowise-ui/src/AppLayout'
import MinimalLayout from 'flowise-ui/src/layout/MinimalLayout'
import AppProvider from 'flowise-ui/src/AppProvider'
import { parseEncodedDomain } from '@/hooks/useApiHost'
import getCachedSession from '@ui/getCachedSession'
import AppLayout from '@ui/AppLayout'

const StudioLayout = async ({ children, params }: { children: React.ReactElement; params: { encodedDomain: string } }) => {
    let session
    try {
        session = await getCachedSession()
    } catch (error) {
        console.error('Error fetching session:', error)
    }
    const apiHost = parseEncodedDomain(params.encodedDomain)
    return (
        <AppLayout
            appSettings={session?.user?.appSettings!}
            // providers={providers}
            session={JSON.parse(JSON.stringify(session))}
            params={params}
            flagsmithState={session?.flagsmithState}
        >
            <FlowiseAppLayout apiHost={apiHost} accessToken={session?.accessToken}>
                <MinimalLayout>{children}</MinimalLayout>
            </FlowiseAppLayout>
        </AppLayout>
    )
}

export default StudioLayout
