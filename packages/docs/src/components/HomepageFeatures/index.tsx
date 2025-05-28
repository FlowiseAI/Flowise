import clsx from 'clsx'
import Heading from '@theme/Heading'
import Link from '@docusaurus/Link'
import styles from './styles.module.css'
import PropTypes from 'prop-types'

type FeatureItem = {
    title: string
    description: string
    icon: string
    buttonText: string
    url: string
}

const FeatureList: FeatureItem[] = [
    {
        title: 'Visual Agent Builder',
        description: 'Prompt to Agent, Use Drag-and-drop blocks to fine-tune, no code required.',
        icon: '🔧',
        buttonText: 'Learn More',
        url: '/docs/sidekick-studio'
    },
    {
        title: 'Sidekick Browser Extension',
        description: 'Search the web, chat with your AI agent, and more, directly from your browser.',
        icon: '🤖',
        buttonText: 'Explore Sidekicks',
        url: '/docs'
    },
    {
        title: 'Plug-in Ecosystem',
        description: '50+ ready connectors; swap OpenAI (ChatGPT), Anthropic (Claude), Google (Gemini), and more.',
        icon: '📚',
        buttonText: 'Discover Knowledge Bases',
        url: '/docs/sidekick-studio/documents/'
    }
]

function Feature({ title, description, icon, buttonText, url }: FeatureItem) {
    return (
        <div className={clsx('col col--4')}>
            <Link to={url} className={styles.featureLink}>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconWrapper}>
                        <div className={styles.featureIcon}>{icon}</div>
                    </div>
                    <div className={styles.featureContent}>
                        <Heading as='h3'>{title}</Heading>
                        <p>{description}</p>
                        <div className={clsx('button button--primary', styles.featureButton)}>{buttonText}</div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

Feature.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    buttonText: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
}

function FullWidthSection({ title, content }: { title: string; content: string }) {
    return (
        <div className={styles.fullWidthSection}>
            <div className='container'>
                <Heading as='h2'>{title}</Heading>
                <p>{content}</p>
            </div>
        </div>
    )
}

FullWidthSection.propTypes = {
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired
}

export default function HomepageFeatures(): JSX.Element {
    return (
        <section className={styles.features}>
            <div className='container'>
                <div className={clsx('row', styles.featureListContainer)}>
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
            <FullWidthSection title='Our Vision' content='Answer Agent AI imagines a world where humans orchestrate—and agents execute.' />
        </section>
    )
}

HomepageFeatures.propTypes = {
    // Add any props if needed
}
