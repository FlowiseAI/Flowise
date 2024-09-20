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
        title: 'Low-Code AI Orchestration',
        description: 'Intuitive drag-and-drop interface for building customized LLM orchestration flows.',
        icon: '🔧',
        buttonText: 'Learn More',
        url: '/docs/using-answerai/sidekick-studio/'
    },
    {
        title: 'AI-Powered Sidekicks',
        description: 'Create and deploy AI sidekicks to enhance productivity and streamline workflows.',
        icon: '🤖',
        buttonText: 'Explore Sidekicks',
        url: '/docs/using-answerai/'
    },
    {
        title: 'Flexible Knowledge Bases',
        description: 'Build and manage knowledge bases to provide context for your AI applications.',
        icon: '📚',
        buttonText: 'Discover Knowledge Bases',
        url: '/docs/using-answerai/knowledge-bases/'
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
            <FullWidthSection
                title='Our Vision'
                content='AnswerAI envisions a world where artificial intelligence is a democratized, decentralized public utility, empowering all of humanity to thrive in the age of AGI.'
            />
            <div className='container'>
                <div className={clsx('row', styles.featureListContainer)}>
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    )
}

HomepageFeatures.propTypes = {
    // Add any props if needed
}
