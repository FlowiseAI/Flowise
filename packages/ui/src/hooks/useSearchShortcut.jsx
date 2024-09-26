import { useEffect } from 'react'
import { getOS } from '@/utils/genericHelper'

const isMac = getOS() === 'macos'

const useSearchShorcut = (inputRef) => {
    useEffect(() => {
        const component = inputRef.current
        const handleKeyDown = (event) => {
            if ((isMac && event.metaKey && event.key === 'f') || (!isMac && event.ctrlKey && event.key === 'f')) {
                event.preventDefault()
                component.focus()
            }
        }

        const handleInputEscape = (event) => {
            if (event.key === 'Escape') component.blur()
        }

        inputRef.current.addEventListener('keydown', handleInputEscape)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            component.addEventListener('keydown', handleInputEscape)
            document.removeEventListener('keydown', handleKeyDown)
        }
    })
}

export default useSearchShorcut
