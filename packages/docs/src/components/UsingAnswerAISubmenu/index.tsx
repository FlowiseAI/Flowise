import React from 'react'
import { useLocation } from '@docusaurus/router'
import Link from '@docusaurus/Link'
import clsx from 'clsx'
import styles from './styles.module.css'

const submenuItems = [
    {
        to: '/apps',
        label: 'Apps',
        icon: '🚀',
        description: 'AI-powered applications'
    },
    {
        to: '/chat',
        label: 'Chat & Sidekicks',
        icon: '💬',
        description: 'Intelligent conversations'
    },
    {
        to: '/browser-extension',
        label: 'Browser Extension',
        icon: '🌐',
        description: 'AI everywhere you browse'
    },
    {
        to: '/sidekick-studio',
        label: 'Studio',
        icon: '🛠️',
        description: 'Build AI workflows'
    },
    {
        to: '/learn',
        label: 'Learn',
        icon: '🎓',
        description: 'Master AI fundamentals'
    }
]

export default function UsingAnswerAISubmenu(): JSX.Element {
    const location = useLocation()

    return (
        <div className={styles.submenuContainer}>
            <div className='container'>
                <nav className={styles.submenu}>
                    <div className={styles.submenuBrand}>
                        <span className={styles.submenuTitle}>Using AnswerAI</span>
                        <div className={styles.submenuGlow}></div>
                    </div>
                    <div className={styles.submenuItems}>
                        {submenuItems.map((item) => {
                            const isActive = location.pathname === item.to
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={clsx(styles.submenuItem, {
                                        [styles.submenuItemActive]: isActive
                                    })}
                                >
                                    <div className={styles.submenuItemIcon}>{item.icon}</div>
                                    <div className={styles.submenuItemContent}>
                                        <div className={styles.submenuItemLabel}>{item.label}</div>
                                        <div className={styles.submenuItemDescription}>{item.description}</div>
                                    </div>
                                    <div className={styles.submenuItemGlow}></div>
                                </Link>
                            )
                        })}
                    </div>
                </nav>
            </div>
        </div>
    )
}
