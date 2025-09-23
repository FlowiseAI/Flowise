import React, { useEffect, useState } from 'react'

interface Props {
    className?: string
    fallbackClassName?: string
}

type SceneComponent = React.ComponentType<Props>

export default function LazyThreeScene({ className, fallbackClassName }: Props): JSX.Element {
    const [ThreeScene, setThreeScene] = useState<SceneComponent | null>(null)

    useEffect(() => {
        let mounted = true

        import('@site/src/components/Annimations/SphereScene')
            .then((module) => {
                if (mounted) {
                    setThreeScene(() => module.default)
                }
            })
            .catch((error) => {
                console.warn('Unable to load ThreeJS scene', error)
            })

        return () => {
            mounted = false
        }
    }, [])

    if (!ThreeScene) {
        return <div className={fallbackClassName || className} aria-hidden='true' />
    }

    return <ThreeScene className={className} />
}
