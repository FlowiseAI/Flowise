import { useState, useEffect, useCallback } from 'react'
import { Sidekick } from '../SidekickSelect.types'

export const useSidekickFavorites = () => {
    const [favorites, setFavorites] = useState<Set<string>>(
        typeof localStorage === 'undefined' ? new Set() : new Set(JSON.parse(localStorage.getItem('favoriteSidekicks') || '[]'))
    )

    // Load favorites from localStorage on mount
    useEffect(() => {
        const storedFavorites = localStorage.getItem('favoriteSidekicks')
        if (storedFavorites) {
            try {
                const parsedFavorites = new Set(JSON.parse(storedFavorites) as string[])
                setFavorites(parsedFavorites)
            } catch (error) {
                console.error('Error parsing favorites:', error)
            }
        }
    }, [])

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        if (favorites.size > 0) {
            localStorage.setItem('favoriteSidekicks', JSON.stringify([...favorites]))
        } else {
            localStorage.setItem('favoriteSidekicks', '[]')
        }
    }, [favorites])

    // Toggle favorite status for a sidekick
    const toggleFavorite = useCallback((sidekick: Sidekick, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation()
        }

        setFavorites((prev) => {
            const newFavorites = new Set(prev)
            if (newFavorites.has(sidekick.id)) {
                newFavorites.delete(sidekick.id)
            } else {
                newFavorites.add(sidekick.id)
            }
            return newFavorites
        })
    }, [])

    return {
        favorites,
        toggleFavorite
    }
}

export default useSidekickFavorites
