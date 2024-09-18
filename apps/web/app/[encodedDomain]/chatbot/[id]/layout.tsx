import AppProvider from 'flowise-ui/src/AppProvider'
import MinimalLayout from 'flowise-ui/src/layout/MinimalLayout'
import AppLayout from '@ui/AppLayout'

const StudioLayout = ({ children }: { children: React.ReactElement }) => {
    return (
        <AppLayout
            noDrawer
            // appSettings={session?.user?.appSettings!}
            // providers={providers}
            // session={JSON.parse(JSON.stringify(session as Session))}
            // params={props.params}
            // flagsmithState={session?.flagsmithState}
        >
            <AppProvider>
                <MinimalLayout>{children}</MinimalLayout>
            </AppProvider>
        </AppLayout>
    )
}

export default StudioLayout
