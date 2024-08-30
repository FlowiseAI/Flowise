import clsx from 'clsx'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import HomepageFeatures from '@site/src/components/HomepageFeatures'
import ThreeJsScene from '@site/src/components/Annimations/SphereScene'
import { useState, useRef, useEffect } from 'react'

import styles from './index.module.css'

function HomepageHeader() {
    const [inputValue, setInputValue] = useState('')
    const textareaRef = useRef(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [inputValue])

    const handleInputChange = (e) => {
        setInputValue(e.target.value)
    }

    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} logoUrl={true} />
            </div>
            <div className={styles.heroContent}>
                <div className={styles.heroChatTypeAhead}>Hello, how can I help you?</div>
                <textarea
                    ref={textareaRef}
                    className={styles.heroChatInput}
                    placeholder='Type your message here...'
                    value={inputValue}
                    onChange={handleInputChange}
                    rows={1}
                />
                <div className={styles.heroSubtitle}>
                    <p>Empowering humanity to ask the right questions in the Age of AGI</p>
                </div>
            </div>
        </header>
    )
}

HomepageHeader.propTypes = {}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={`Hello from ${siteConfig.title}`} description='Description will go into a meta tag in <head />'>
            <HomepageHeader />
            <main>
                <HomepageFeatures />
            </main>
        </Layout>
    )
}

Home.propTypes = {}
