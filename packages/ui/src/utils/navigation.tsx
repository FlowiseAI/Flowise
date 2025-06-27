'use client'

import { useRouter as useNextRouter, usePathname as useNextPathname, useParams as useNextParams } from 'next/navigation'
import NextLink, { LinkProps as NextLinkProps } from 'next/link'
import React from 'react'

export const usePathname = useNextPathname

export const useNavigationState = () => {
    const [state, setState] = React.useState<any>(null)

    React.useEffect(() => {
        const serializedState = sessionStorage.getItem('navigationState')
        if (serializedState) {
            try {
                const parsedState = JSON.parse(serializedState)
                setState(parsedState)
            } catch (error) {
                console.error('Failed to parse state:', error)
                setState(null)
            }
        } else {
            setState(null)
        }
    }, [])

    const setNavigationState = (newState: any) => {
        if (newState) {
            const serializedState = JSON.stringify(newState)
            sessionStorage.setItem('navigationState', serializedState)
        } else {
            sessionStorage.removeItem('navigationState')
        }
        setState(newState)
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
        setNavigationState(options?.state || null)

        if (url === -1) {
            nextRouter.back()
            return
        }

        if (url === 0) {
            nextRouter.refresh()
            return
        }
        const fullUrl = `/sidekick-studio${url}`
        if (options?.replace) {
            nextRouter.push(fullUrl)
        } else {
            nextRouter.push(fullUrl)
        }
    }

    return navigate
}

export const useLocation = () => {
    const pathname = usePathname()
    const [state] = useNavigationState()

    return { pathname, state }
}

export const useParams = () => {
    const params = useNextParams()
    return params
}

interface LinkProps extends Omit<NextLinkProps, 'href'> {
    to?: string
    href?: string
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, href, ...props }, ref) {
    if (!to && !href) {
        return null
    }
    const linkHref = `/sidekick-studio${href ?? to}`
    return <NextLink {...props} ref={ref} href={linkHref} />
})

Link.displayName = 'Link'
