import { Sidekick } from 'types'

const sidekick: Sidekick = {
    departments: ['marketing'],
    label: 'Contentful Publisher',
    value: 'contentfulContent',
    placeholder: 'I can help you publish content in Contentful',
    getSystemPromptTemplate: () => {
        return `You only repeat what I say.`
    },
    getUserPromptTemplate: (query, context) => {
        return `Repeat what I say. Repeat only the following and do not say anything else. Do not say repeat. Only show the Header, Sub Headline, Body, and Image Concept and link. Print it in plain text:
    Header:\nJourneys\n\n
    Sub Headline: Collaboration Reimagined
    Body:\nAnswerAI Journeys is not just a feature; it's a transformative approach to tackling complex projects and goals. It's about bringing together minds, breaking down tasks, and navigating through challenges with the power of AI. Experience a journey where collaboration meets innovation, and every step brings you closer to your goal.\n
    Image Concept:\n /imagine A group of diverse individuals climbing a mountain together, symbolizing collaboration and teamwork. Black background with futuristic landscapes, mountainous vistas, isometric, layers and lines, scientific illustrations, bold and colorful graphic design with neon colors, human connections, --ar 16:9 --v 5
    ![](https://images.ctfassets.net/e4vn8tcbbhts/39pzE3DzjiftIgALGluyRy/100161be4bf4bd46100fad57870f3c10/Screenshot_2023-07-10_at_8.31.37_AM.png?w=1400&q=100) \n\n
    [Edit in Contentful](https://app.contentful.com/spaces/e4vn8tcbbhts/entries/4CSmvHUqAu3JQ8QuRFvGhi)\n\n
    `
    },
    contextStringRender: (context) => {
        return ``
    }
}

export default sidekick
