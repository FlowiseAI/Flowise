'use client'

import { useRouter as useNextRouter, usePathname as useNextPathname, useParams as useNextParams } from 'next/navigation'
import NextLink, { LinkProps as NextLinkProps } from 'next/link'
import React from 'react'

// Debug configuration
interface NavigationDebugConfig {
    enabled: boolean
    logLevel: 'info' | 'debug' | 'verbose'
    prefix: string
}

const DEFAULT_DEBUG_CONFIG: NavigationDebugConfig = {
    enabled: false,
    logLevel: 'info',
    prefix: '[Navigation]'
}

let debugConfig = DEFAULT_DEBUG_CONFIG

// Debug utilities
const logger = {
    info: (message: string, data?: any) => {
        if (debugConfig.enabled) {
            console.log(`${debugConfig.prefix} ${message}`, data || '')
        }
    },
    debug: (message: string, data?: any) => {
        if (debugConfig.enabled && ['debug', 'verbose'].includes(debugConfig.logLevel)) {
            console.log(`${debugConfig.prefix} [DEBUG] ${message}`, data || '')
        }
    },
    verbose: (message: string, data?: any) => {
        if (debugConfig.enabled && debugConfig.logLevel === 'verbose') {
            console.log(`${debugConfig.prefix} [VERBOSE] ${message}`, data || '')
        }
    },
    error: (message: string, error?: any) => {
        if (debugConfig.enabled) {
            console.error(`${debugConfig.prefix} [ERROR] ${message}`, error || '')
        }
    }
}

// Export debug configuration functions
export const setNavigationDebug = (config: Partial<NavigationDebugConfig>) => {
    debugConfig = { ...debugConfig, ...config }
    logger.info('Debug configuration updated', debugConfig)
}

export const getNavigationDebug = () => debugConfig

export const usePathname = useNextPathname

export const useNavigationState = () => {
    const [state, setState] = React.useState<any>(() => {
        const serializedState = sessionStorage.getItem('navigationState')
        if (serializedState) {
            return JSON.parse(serializedState)
        }
        return {}
    })

    const setNavigationState = (newState: any) => {
        logger.debug('Setting navigation state', newState)
        if (newState) {
            try {
                const serializedState = JSON.stringify(newState)
                sessionStorage.setItem('navigationState', serializedState)
                logger.info('Navigation state saved to sessionStorage', newState)
            } catch (error) {
                logger.error('Failed to serialize navigation state', error)
                return
            }
        } else {
            sessionStorage.removeItem('navigationState')
            logger.info('Navigation state cleared from sessionStorage')
        }
        setState(newState)
        logger.verbose('Navigation state updated in component', newState)
    }
    return [state, setNavigationState] as const
}

// Utility function to generate hrefs that work in both local and staging environments
export const getHref = (path: string) => {
    if (typeof window === 'undefined') {
        // Server-side: always include the base path
        return `/sidekick-studio${path}`
    }

    // Client-side: check if we're in an environment that uses the base path
    const currentPath = window.location.pathname
    const hasBasePath = currentPath.startsWith('/sidekick-studio')

    if (hasBasePath) {
        return `/sidekick-studio${path}`
    } else {
        return path
    }
}

export const useNavigate = () => {
    const nextRouter = useNextRouter()
    const [, setNavigationState] = useNavigationState()
    const navigate = (url: string | number, options?: { state?: any; replace?: boolean }) => {
        // console.log('[Navigation] navigate', url, options)
        logger.info('Navigation initiated', { url, options })

        // Log state changes
        if (options?.state) {
            logger.debug('Setting navigation state during navigate', options.state)
        }
        setNavigationState(options?.state || null)

        if (url === -1) {
            logger.info('Executing browser back navigation')
            nextRouter.back()
            return
        }

        if (url === 0) {
            logger.info('Executing page refresh')
            nextRouter.refresh()
            return
        }

        const fullUrl = `/sidekick-studio${url}`
        logger.info('Navigating to URL', {
            originalUrl: url,
            fullUrl,
            replace: options?.replace || false
        })

        if (options?.replace) {
            logger.debug('Using replace navigation')
            nextRouter.replace(fullUrl)
        } else {
            logger.debug('Using push navigation')
            nextRouter.push(fullUrl)
        }

        logger.verbose('Navigation command completed', { url: fullUrl, method: options?.replace ? 'replace' : 'push' })
    }

    return navigate
}

export const useLocation = () => {
    const pathname = usePathname()
    const [state] = useNavigationState()

    logger.verbose('Location accessed', { pathname, state })

    return { pathname, state }
}

export const useParams = () => {
    const params = useNextParams()
    logger.verbose('Params accessed', params)
    return params
}

interface LinkProps extends Omit<NextLinkProps, 'href'> {
    to?: string
    href?: string
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, href, ...props }, ref) {
    if (!to && !href) {
        logger.debug('Link component rendered with no destination')
        return null
    }

    const linkHref = `/sidekick-studio${href ?? to}`
    logger.verbose('Link component rendered', {
        originalHref: href ?? to,
        fullHref: linkHref
    })

    return <NextLink {...props} ref={ref} href={linkHref} />
})

Link.displayName = 'Link'
