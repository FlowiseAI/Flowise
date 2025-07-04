import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import clsx from 'clsx'

interface Integration {
    name: string
    domain: string
    description: string
    category: string
    prominence?: 'large' | 'medium' | 'small' // Add prominence for sizing
}

interface IntegrationProps {
    integrations: Integration[]
    className?: string
}

interface HoverInfo {
    integration: Integration
    x: number
    y: number
}

const AnimatedIntegrations: React.FC<IntegrationProps> = ({ integrations, className }) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene>()
    const rendererRef = useRef<THREE.WebGLRenderer>()
    const cameraRef = useRef<THREE.PerspectiveCamera>()
    const frameId = useRef<number>()
    const logosRef = useRef<THREE.Group[]>([])
    const linesRef = useRef<THREE.Line[]>([])
    const triangleRef = useRef<THREE.Mesh>()
    const hoverTimeoutRef = useRef<NodeJS.Timeout>()
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
    const [isHovered, setIsHovered] = useState(false)

    // Create logo texture from Clearbit API (fixed for color)
    const createLogoTexture = useCallback((domain: string): Promise<THREE.Texture> => {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader()
            // Remove greyscale parameter and add format for color logos
            const logoUrl = `https://logo.clearbit.com/${domain}?size=256&format=png`
            
            loader.load(
                logoUrl,
                (texture) => {
                    texture.generateMipmaps = false
                    texture.minFilter = THREE.LinearFilter
                    texture.magFilter = THREE.LinearFilter
                    texture.flipY = false
                    texture.wrapS = THREE.ClampToEdgeWrapping
                    texture.wrapT = THREE.ClampToEdgeWrapping
                    resolve(texture)
                },
                undefined,
                (error) => {
                    // Fallback to a colorful default texture
                    const canvas = document.createElement('canvas')
                    canvas.width = 256
                    canvas.height = 256
                    const ctx = canvas.getContext('2d')!
                    
                    // Create a colorful gradient background
                    const gradient = ctx.createLinearGradient(0, 0, 256, 256)
                    gradient.addColorStop(0, '#667eea')
                    gradient.addColorStop(1, '#764ba2')
                    ctx.fillStyle = gradient
                    ctx.fillRect(0, 0, 256, 256)
                    
                    ctx.fillStyle = '#fff'
                    ctx.font = 'bold 24px sans-serif'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    const companyName = domain.split('.')[0].toUpperCase()
                    ctx.fillText(companyName, 128, 128)
                    
                    const texture = new THREE.CanvasTexture(canvas)
                    resolve(texture)
                }
            )
        })
    }, [])

    // Generate constellation positions
    const generateConstellationPositions = useCallback((count: number) => {
        const positions: Array<{ x: number; y: number; z: number }> = []
        const width = 120   // Much larger to use full horizontal space
        const height = 80   // Much larger to use full vertical space
        
        for (let i = 0; i < count; i++) {
            // Completely random distribution across the entire area
            const x = (Math.random() - 0.5) * width    // Full width from -60 to +60
            const y = (Math.random() - 0.5) * height   // Full height from -40 to +40
            const z = (Math.random() - 0.5) * 10       // More depth variation
            
            positions.push({ x, y, z })
        }
        
        return positions
    }, [])

    // Create central triangle
    const createCentralTriangle = useCallback(() => {
        const geometry = new THREE.ConeGeometry(5, 8, 3)
        const material = new THREE.MeshLambertMaterial({
            color: 0x667eea,
            transparent: true,
            opacity: 0.8,
            emissive: 0x221133
        })
        
        const triangle = new THREE.Mesh(geometry, material)
        triangle.rotation.z = Math.PI
        triangle.position.set(0, 0, 0)
        
        return triangle
    }, [])

    // Create connecting line
    const createConnectionLine = useCallback((start: THREE.Vector3, end: THREE.Vector3) => {
        const points = [start, end]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
            color: 0x667eea,
            transparent: true,
            opacity: 0.3
        })
        
        return new THREE.Line(geometry, material)
    }, [])

    // Get logo size based on prominence
    const getLogoSize = useCallback((prominence: string) => {
        switch (prominence) {
            case 'large': return 6.0
            case 'medium': return 4.5
            case 'small': return 3.5
            default: return 4.5
        }
    }, [])

    // Initialize Three.js scene
    useEffect(() => {
        if (!mountRef.current) return

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0f1a)
        sceneRef.current = scene

        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000)
        camera.position.z = 100 // Much further back to see the full spread
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        })
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        mountRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Add lights for better logo visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
        directionalLight.position.set(5, 5, 5)
        scene.add(directionalLight)

        // Add point lights for more dynamic lighting
        const pointLight1 = new THREE.PointLight(0x667eea, 0.5, 100)
        pointLight1.position.set(10, 10, 10)
        scene.add(pointLight1)

        const pointLight2 = new THREE.PointLight(0x764ba2, 0.5, 100)
        pointLight2.position.set(-10, -10, 10)
        scene.add(pointLight2)

        // Create central triangle
        const triangle = createCentralTriangle()
        scene.add(triangle)
        triangleRef.current = triangle

        // Create constellation
        const createConstellation = async () => {
            const positions = generateConstellationPositions(integrations.length)
            const logoGroups: THREE.Group[] = []
            const lines: THREE.Line[] = []

            for (let i = 0; i < integrations.length; i++) {
                const integration = integrations[i]
                const position = positions[i]
                
                try {
                    const texture = await createLogoTexture(integration.domain)
                    
                    const size = getLogoSize(integration.prominence || 'medium')
                    const geometry = new THREE.PlaneGeometry(size, size)
                    const material = new THREE.MeshLambertMaterial({
                        map: texture,
                        transparent: true,
                        side: THREE.DoubleSide,
                        alphaTest: 0.1
                    })
                    
                    const mesh = new THREE.Mesh(geometry, material)
                    const group = new THREE.Group()
                    group.add(mesh)
                    
                    // Position in constellation
                    group.position.set(position.x, position.y, position.z)
                    
                    // Store integration data
                    ;(group as any).integrationData = integration
                    ;(group as any).originalPosition = group.position.clone()
                    ;(group as any).prominence = integration.prominence || 'medium'
                    
                    scene.add(group)
                    logoGroups.push(group)

                    // Create connection line to triangle
                    const line = createConnectionLine(
                        new THREE.Vector3(position.x, position.y, position.z),
                        new THREE.Vector3(0, 0, 0)
                    )
                    scene.add(line)
                    lines.push(line)
                    
                } catch (error) {
                    console.warn(`Failed to load logo for ${integration.domain}:`, error)
                }
            }
            
            logosRef.current = logoGroups
            linesRef.current = lines
        }

        createConstellation()

        // Handle mouse events with drag support
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        let isDragging = false
        let previousMousePosition = { x: 0, y: 0 }

        const onMouseMove = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            // Handle dragging
            if (isDragging) {
                const deltaX = event.clientX - previousMousePosition.x
                const deltaY = event.clientY - previousMousePosition.y
                
                // Rotate camera around the scene
                const spherical = new THREE.Spherical()
                spherical.setFromVector3(camera.position)
                spherical.theta -= deltaX * 0.01
                spherical.phi += deltaY * 0.01
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))
                
                camera.position.setFromSpherical(spherical)
                camera.lookAt(0, 0, 0)
                
                previousMousePosition = { x: event.clientX, y: event.clientY }
                return
            }

            raycaster.setFromCamera(mouse, camera)
            const intersects = raycaster.intersectObjects(logosRef.current, true)

            if (intersects.length > 0) {
                const group = intersects[0].object.parent as THREE.Group & { integrationData: Integration }
                if (group && group.integrationData) {
                    // Project 3D logo position to screen coordinates
                    const logoWorldPosition = group.position.clone()
                    const logoScreenPosition = logoWorldPosition.project(camera)
                    
                    // Convert normalized coordinates to screen pixels
                    const canvasRect = renderer.domElement.getBoundingClientRect()
                    const logoScreenX = (logoScreenPosition.x + 1) * canvasRect.width / 2 + canvasRect.left
                    const logoScreenY = (-logoScreenPosition.y + 1) * canvasRect.height / 2 + canvasRect.top
                    
                    // Position popup next to the logo
                    const popupWidth = 280
                    const popupHeight = 150
                    const offset = 20
                    
                    let x = logoScreenX + offset
                    let y = logoScreenY - popupHeight / 2
                    
                    // Keep popup on screen
                    const viewportWidth = window.innerWidth
                    const viewportHeight = window.innerHeight
                    
                    if (x + popupWidth > viewportWidth) {
                        x = logoScreenX - popupWidth - offset
                    }
                    if (y < 0) {
                        y = 10
                    }
                    if (y + popupHeight > viewportHeight) {
                        y = viewportHeight - popupHeight - 10
                    }
                    
                    setHoverInfo({
                        integration: group.integrationData,
                        x,
                        y
                    })
                    setIsHovered(true)
                    renderer.domElement.style.cursor = 'pointer'
                }
            } else {
                // Don't hide popup immediately - let popup handle its own hover
                renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab'
            }
        }

        const onMouseDown = (event: MouseEvent) => {
            isDragging = true
            previousMousePosition = { x: event.clientX, y: event.clientY }
            renderer.domElement.style.cursor = 'grabbing'
        }

        const onMouseUp = () => {
            isDragging = false
            renderer.domElement.style.cursor = 'grab'
        }

        const onMouseLeave = () => {
            isDragging = false
            renderer.domElement.style.cursor = 'default'
        }

        renderer.domElement.addEventListener('mousemove', onMouseMove)
        renderer.domElement.addEventListener('mousedown', onMouseDown)
        renderer.domElement.addEventListener('mouseup', onMouseUp)
        renderer.domElement.addEventListener('mouseleave', onMouseLeave)
        renderer.domElement.style.cursor = 'grab'

        // Animation loop
        const animate = () => {
            frameId.current = requestAnimationFrame(animate)

            const time = Date.now() * 0.001

            // Animate triangle rotation
            if (triangleRef.current) {
                triangleRef.current.rotation.y = time * 0.5
                triangleRef.current.rotation.z = Math.sin(time * 0.3) * 0.1 + Math.PI
            }

            // Animate logos with subtle floating and breathing
            logosRef.current.forEach((group, index) => {
                const originalPos = (group as any).originalPosition
                const prominence = (group as any).prominence
                
                // Subtle floating animation
                group.position.x = originalPos.x + Math.sin(time * 0.5 + index) * 0.1
                group.position.y = originalPos.y + Math.cos(time * 0.3 + index) * 0.1
                group.position.z = originalPos.z + Math.sin(time * 0.7 + index) * 0.2
                
                // Breathing effect based on prominence
                const breathingScale = prominence === 'large' ? 1.05 : prominence === 'medium' ? 1.03 : 1.02
                const scale = 1 + Math.sin(time * 2 + index) * (breathingScale - 1)
                group.scale.setScalar(scale)
                
                // Gentle rotation
                group.rotation.z = Math.sin(time + index) * 0.05
            })

            // Animate connection lines opacity
            linesRef.current.forEach((line, index) => {
                const material = line.material as THREE.LineBasicMaterial
                material.opacity = 0.2 + Math.sin(time * 2 + index) * 0.1
            })

            renderer.render(scene, camera)
        }

        animate()

        // Handle resize
        const handleResize = () => {
            if (!mountRef.current) return
            
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
            camera.updateProjectionMatrix()
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            renderer.domElement.removeEventListener('mousemove', onMouseMove)
            renderer.domElement.removeEventListener('mousedown', onMouseDown)
            renderer.domElement.removeEventListener('mouseup', onMouseUp)
            renderer.domElement.removeEventListener('mouseleave', onMouseLeave)
            
            if (frameId.current) {
                cancelAnimationFrame(frameId.current)
            }
            
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
            }
            
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement)
            }
            
            // Clean up Three.js resources
            logosRef.current.forEach(group => {
                group.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose()
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose())
                        } else {
                            child.material.dispose()
                        }
                    }
                })
            })
            
            linesRef.current.forEach(line => {
                line.geometry.dispose()
                ;(line.material as THREE.Material).dispose()
            })
            
            renderer.dispose()
        }
    }, [integrations, createLogoTexture, generateConstellationPositions, createCentralTriangle, createConnectionLine, getLogoSize])

    return (
        <div className={clsx('integration-animation-container', className)} style={{ position: 'relative' }}>
            <div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '600px',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            />

            {/* Hover flyout */}
            {hoverInfo && (
                <div
                    style={{
                        position: 'fixed',
                        left: hoverInfo.x,
                        top: hoverInfo.y,
                        background: 'rgba(10, 15, 26, 0.95)',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        color: 'white',
                        fontSize: '14px',
                        zIndex: 1000,
                        maxWidth: '280px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 12px 40px rgba(102, 126, 234, 0.2)'
                    }}
                    onMouseEnter={() => {
                        // Clear any pending hide timeout
                        if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current)
                        }
                        setIsHovered(true)
                    }}
                    onMouseLeave={() => {
                        // Delay hiding the popup
                        hoverTimeoutRef.current = setTimeout(() => {
                            setHoverInfo(null)
                            setIsHovered(false)
                        }, 200)
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#667eea', fontSize: '16px' }}>
                        {hoverInfo.integration.name}
                    </div>
                    <div style={{ marginBottom: '10px', opacity: 0.9, lineHeight: '1.4' }}>
                        {hoverInfo.integration.description}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
                        Category: {hoverInfo.integration.category}
                    </div>
                    <button
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            padding: '8px 16px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                        }}
                        onClick={() => window.open('https://studio.theanswer.ai', '_blank')}
                    >
                        Sign Up Now →
                    </button>
                </div>
            )}
        </div>
    )
}

export default AnimatedIntegrations 