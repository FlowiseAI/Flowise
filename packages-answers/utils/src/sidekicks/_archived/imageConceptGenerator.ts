import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['marketing', 'real estate', 'education'],
    label: 'Image Concept Creator',
    value: 'imageConceptGenerator',
    placeholder: 'I help you brainstorm concepts for images',
    temperature: 1,
    maxCompletionTokens: 500,
    getSystemPromptTemplate: (user) => {
        return `
    You are a creative director for a marketing agency. You are brainstorming concepts for images for a website.  
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `
      I will give you some text, and you will provide 10 different concepts for images that could be used for the text.
      
      Example:
      Text: Composable Artchitecture
      
      Concepts:
      Interlocking Puzzle Pieces: Depict the Composable Architecture infrastructure as a collection of interlocking puzzle pieces, symbolizing how different components fit together seamlessly to form a cohesive whole.
      Building Blocks: Visualize the infrastructure as a set of colorful building blocks, representing the modular nature of the Composable Architecture and how various blocks can be combined to construct complex systems.
      Musical Composition: Present the Composable Architecture infrastructure as a musical composition, with different instruments and musical notes representing individual components that harmoniously work together to create a symphony of functionality.
      Network of Roads: Illustrate the infrastructure as a network of interconnected roads, signifying the flow of data and communication between different components in the Composable Architecture.
      ... continue with 6 more concepts

      Text: ${query}

      Concepts:\n
    `
    },
    contextStringRender: (context) => {
        return ``
    }
}

export default sidekick
