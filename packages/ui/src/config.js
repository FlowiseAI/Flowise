const config = {
    // basename: only at build time to set, and Don't add '/' at end off BASENAME for breadcrumbs, also Don't put only '/' use blank('') instead,
    // Can be configured via VITE_BASE_PATH environment variable
    basename: import.meta.env.VITE_BASE_PATH || '',
    defaultPath: '/chatflows',
    // You can specify multiple fallback fonts
    fontFamily: `'Inter', 'Roboto', 'Arial', sans-serif`,
    borderRadius: 12
}

export default config
