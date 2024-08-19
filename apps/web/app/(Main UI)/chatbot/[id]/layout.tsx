import AppProvider from 'flowise-ui/src/AppProvider'
import MinimalLayout from 'flowise-ui/src/layout/MinimalLayout'

const StudioLayout = ({ children }: { children: React.ReactElement }) => {
    return (
        <AppProvider>
            <MinimalLayout>{children}</MinimalLayout>
        </AppProvider>
    )
}

export default StudioLayout
