import clsx from 'clsx'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

// Define PropTypes for the component
import PropTypes from 'prop-types'

type FeatureItem = {
    title: string
    description: string
    icon: string
}

const FeatureList: FeatureItem[] = [
    {
        title: 'Low-Code LLM Orchestration',
        description: 'Intuitive drag-and-drop interface for building customized LLM orchestration flows.',
        icon: '🔧'
    },
    {
        title: 'AI-Powered Sidekicks',
        description: 'Create and deploy AI sidekicks to enhance productivity and streamline workflows.',
        icon: '🤖'
    },
    {
        title: 'Flexible Knowledge Bases',
        description: 'Build and manage knowledge bases to provide context for your AI applications.',
        icon: '📚'
    }
]

function Feature({ title, description, icon }: FeatureItem) {
    return (
        <div className={clsx('col col--4')}>
            <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{icon}</div>
                <div className={styles.featureContent}>
                    <Heading as='h3'>{title}</Heading>
                    <p>{description}</p>
                </div>
            </div>
        </div>
    )
}

Feature.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired
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
                <div className='row'>
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>

            <FullWidthSection
                title='Our Mission'
                content='Transform AI from a tool of centralized power into a force for global collaboration, innovation, and ethical progress, ensuring that as we create entities with intelligence that may one day surpass our own, we do so in a way that preserves and enhances human dignity, creativity, and freedom.'
            />
        </section>
    )
}

HomepageFeatures.propTypes = {
    // Add any props if needed
}
