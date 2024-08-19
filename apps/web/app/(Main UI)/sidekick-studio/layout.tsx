import AppProvider from 'flowise-ui/src/AppProvider'

const StudioLayout = ({ children }: { children: React.ReactElement }) => {
    return <AppProvider>{children}</AppProvider>
}

export default StudioLayout
