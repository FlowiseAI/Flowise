import React from 'react'
import { useLocation } from '@docusaurus/router'
import Link from '@docusaurus/Link'
import clsx from 'clsx'
import styles from './styles.module.css'

const submenuItems = [
    {
        to: '/agents',
        label: 'Agents',
        icon: '🤖',
        description: 'AI-powered sidekicks'
    },
    {
        to: '/chat',
        label: 'Chat',
        icon: '💬',
        description: 'Intelligent conversations'
    },
    {
        to: '/browser-sidekick',
        label: 'Browser Sidekick',
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
    },
    {
        to: '/ai-workshops',
        label: 'AI Workshops',
        icon: '🎯',
        description: 'Expert-led team training'
    }
]

export default function UsingAnswerAISubmenu(): JSX.Element {
    const location = useLocation()

    return (
        <div className={styles.submenuContainer}>
            <div className='container'>
                <nav className={styles.submenu}>
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
