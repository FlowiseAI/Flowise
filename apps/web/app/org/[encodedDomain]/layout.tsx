import AppProvider from 'flowise-ui/src/AppProvider'
import MinimalLayout from 'flowise-ui/src/layout/MinimalLayout'
import AppLayout from '@ui/AppLayout'
import { parseEncodedDomain } from '@/hooks/useApiHost'

const StudioLayout = ({ children, params }: { children: React.ReactElement; params: { encodedDomain: string } }) => {
    const apiHost = parseEncodedDomain(params.encodedDomain)
    console.log('[EncodedDomainStudioLayout] apiHost:', apiHost)
    return (
        <AppLayout
            noDrawer
            // appSettings={session?.user?.appSettings!}
            // providers={providers}
            // session={JSON.parse(JSON.stringify(session as Session))}
            // params={props.params}
            // flagsmithState={session?.flagsmithState}
        >
            <AppProvider apiHost={apiHost}>
                <MinimalLayout>{children}</MinimalLayout>
            </AppProvider>
        </AppLayout>
    )
}

export default StudioLayout
