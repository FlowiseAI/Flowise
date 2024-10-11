// constant
export const gridSpacing = 3
export const drawerWidth = 260
export const appDrawerWidth = 320
export const headerHeight = 80
export const maxScroll = 100000

export let baseURL =
    typeof window !== 'undefined'
        ? process.env.PROD === true
            ? window.location.origin
            : window.location.origin.replace(`:${process.env.VITE_PORT ?? '8080'}`, ':4000')
        : process.env.BASE_URL || 'http://localhost:4000'

if (typeof sessionStorage !== 'undefined') {
    baseURL = sessionStorage.getItem('baseURL') || baseURL
}
export const setBaseURL = (url) => {
    console.log('[setBaseURL] Setting baseURL to:', url)
    baseURL = url?.replace('8080', '4000')
    sessionStorage.setItem('baseURL', baseURL)
}
export const uiBaseURL = typeof window !== 'undefined' ? `${window?.location?.origin}/sidekick-studio` : undefined
export const FLOWISE_CREDENTIAL_ID = 'FLOWISE_CREDENTIAL_ID'
export const REDACTED_CREDENTIAL_VALUE = '_FLOWISE_BLANK_07167752-1a71-43b1-bf8f-4f32252165db'

console.log('[constant.js] baseURL:', baseURL)
