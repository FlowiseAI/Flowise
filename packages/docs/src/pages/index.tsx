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

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/aai-embed/dist/web.js'
        script.type = 'module'

        script.onload = () => {
            window.Chatbot.init({
                chatflowid: 'e24d5572-a27a-40b9-83fe-19a376535b9d',
                apiHost: 'https://lastrev.flowise.theanswer.ai'
            })
        }
        document.body.appendChild(script)

        return () => {
            document.body.removeChild(script)
        }
    }, [])

    const handleInputChange = (e) => {
        setInputValue(e.target.value)
    }

    return (
        <header className={clsx('hero hero--primary', styles.heroSection)}>
            <div className={styles.heroBackground}>
                <ThreeJsScene className={styles.threeJsCanvas} logoUrl={true} />
            </div>
            <div className={styles.heroContent}>
                <img src='img/answerai-logo-600-wide-white.png' alt='AnswerAI Logo' className={styles.heroLogo} />
                <div className={styles.heroSubtitle}>
                    <p>Empowering you to ask the right questions in the age of AI</p>
                </div>
            </div>
        </header>
    )
}

HomepageHeader.propTypes = {}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`AnswerAI: Empowering you to ask the right questions in the age of AI`}
            description='AnswerAI is the platform that empowers you create advanced AI applications with low-code.'
        >
            <HomepageHeader />
            <main>
                <HomepageFeatures />
            </main>
        </Layout>
    )
}

Home.propTypes = {}
