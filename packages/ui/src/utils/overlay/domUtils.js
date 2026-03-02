// DOM utility functions for overlay system

// Get bounding rect for a target element
export function getTargetRect(selector) {
    try {
        const el = document.querySelector(selector)
        if (!el) return null
        return el.getBoundingClientRect()
    } catch (error) {
        console.error('Failed to get target rect:', error)
        return null
    }
}

// Wait for element to appear in DOM
export async function waitForElement(selector, timeout = 5000) {
    const startTime = Date.now()

    return new Promise((resolve) => {
        const checkElement = () => {
            const el = document.querySelector(selector)
            if (el) {
                resolve(el)
                return
            }

            if (Date.now() - startTime > timeout) {
                console.warn(`Element ${selector} not found after ${timeout}ms`)
                resolve(null)
                return
            }

            setTimeout(checkElement, 100)
        }

        checkElement()
    })
}
