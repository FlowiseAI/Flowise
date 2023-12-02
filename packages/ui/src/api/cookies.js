export function getCookieValue(cookieName = '', cookie = '') {
    const matches = cookie.match(`(^|[^;]+)\\s*${cookieName}\\s*=\\s*([^;]+)`)
    return matches ? matches.pop() : ''
}

export function getAuthorizationConfig(config) {
    config.headers = {
        'Content-type': 'application/json'
    }
    if (!localStorage.getItem('loggedIn')) {
        return { ...config }
    }

    // this condition is true only when the login dialog is open and clicked on login
    if (localStorage.getItem('username') && localStorage.getItem('password')) {
        config.auth = {
            username: localStorage.getItem('username'),
            password: localStorage.getItem('password')
        }
        localStorage.removeItem('username')
        localStorage.removeItem('password')
        return config
    }

    const value = getCookieValue('flowise', document.cookie)
    if (value) {
        config.headers = {
            'Content-Type': 'application/json, text/plain, */*',
            Authorization: 'Basic ' + value
        }
    }
    return config
}

export function getUsername() {
    if (!localStorage.getItem('loggedIn')) {
        return undefined
    }
    return getCookieValue('flowise-user', document.cookie)
}

export function removeCookies() {
    document.cookie = 'cookiename= ; expires = Thu, 01 Jan 1970 00:00:00 GMT'
    localStorage.removeItem('loggedIn')
}
