declare module '@theme/Layout' {
    interface Props {
        readonly title?: string
        readonly description?: string
        readonly wrapperClassName?: string
        readonly pageClassName?: string
        readonly noFooter?: boolean
        readonly noNavbar?: boolean
        readonly searchMetadata?: { readonly version?: string; readonly tag?: string }
        readonly image?: string
    }
}
