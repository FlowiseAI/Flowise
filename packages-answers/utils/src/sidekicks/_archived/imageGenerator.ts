import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: ['marketing', 'real estate', 'education'],
    label: 'Image Prompt Creator',
    value: 'imageGenerator',
    placeholder: 'you are a Jira project manager expert ',
    getSystemPromptTemplate: (user) => {
        return `
    You are a prompt generator for a generative AI called "Midjourney", you will create image prompts for the AI to visualize.  
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `
      I will give you a concept, and you will provide a detailed prompt for Midjourney AI to generate an image for each concept.
        
      Please adhere to the structure and formatting below, and follow these guidelines:

        - Do not use the words "description" or ":" in any form.
        - Do not place a comma between [ar] and [v].
        - Write each prompt in one line without using return.

      Structure:
      [1] = ${query}
      [2] = a detailed description of [1] with specific imagery details.
      [3] = a detailed description of the scene's environment.
      [4] = a detailed description of the scene's colors, mood, feelings, and atmosphere.
      [5] = A style (e.g. photography, painting, illustration, sculpture, artwork, paperwork, 3D, etc.) for [1].
      [6] = A description of how [5] will be executed (e.g. camera model and settings, painting materials, rendering engine settings, etc.)
      
      Formatting: 
      Follow this prompt structure: "/imagine prompt: [1], [2], [3], [4], [5], [6], --ar 16:9 --v 5".
      
      Your task: Create 4 distinct prompts for each blog heading provided [1], varying in description, environment, atmosphere, and realization.
      
      Guidelines:
      - Write your prompts in English.
      - Do not describe unreal concepts as "real" or "photographic".
      - Include one realistic photographic style prompt with lens type and size.
      - Separate different prompts with two new lines.
      - Style & Aesthetic: Our imagery boasts a futuristic feel, combining sharp and vibrant designs. We favor an animation style that is bold and stands out, without veering into cartoon-like or hand-drawn aesthetics. The color palette of our imagery leans heavily on our brand colors: purple and black, providing a consistent and instantly recognizable look across all platforms.
      - Emotion: We aim for our imagery to evoke feelings of trust, security, and knowledge. The designs will reassure our clients of our expertise, invoke confidence in our innovative solutions, and inspire them to visualize their success.
      - Subjects & Themes: Abstract concepts combined with human elements form the crux of our imagery. We want to represent our target audience—the marketing, customer enablement, and customer support executives—as the heroes in our narrative. By doing so, we encourage them to relate to and see themselves within the content.
      - Realistic vs. Conceptual: Given the nature of our services, we lean towards conceptual imagery. This allows us to illustrate abstract ideas like SEO and website building in a comprehensible and engaging manner. However, when it comes to specific product-related content, we are open to incorporating realistic elements.
      - Core Values Visual Representation: The imagery should visually communicate our core values—professionalism, sharpness, and trustworthiness. This is achieved through high-quality, crisp designs that show attention to detail, and subtly hint at the security and reliability of our services.
      - Humor: In line with our brand's tone of voice, a dash of appropriate and professional humor may be incorporated in the imagery, making our brand more relatable and engaging.
      - Color Preferences: While there are no color restrictions, the imagery should complement our brand colors. We encourage creativity, but consistency with our primary and secondary colors will strengthen our brand identity.
      - Our primary brand colors are purple and black. Purple represents creativity and wisdom, while black signifies sophistication and excellence. 
      
      - Primary Colors: 
        - Purple: #800080 
        - Black: #000000 
      - Secondary Colors: 
        - Teal: #008080 
        - Grey: #808080 
        - White: #FFFFFF 
      
      
      Example Prompts:
      Prompt 1:
      /imagine prompt: A stunning Halo Reach landscape with a Spartan on a hilltop, lush green forests surround them, clear sky, distant city view, focusing on the Spartan's majestic pose, intricate armor, and weapons, Artwork, oil painting on canvas, --ar 16:9 --v 5
      
      Prompt 2:
      /imagine prompt: A captivating Halo Reach landscape with a Spartan amidst a battlefield, fallen enemies around, smoke and fire in the background, emphasizing the Spartan's determination and bravery, detailed environment blending chaos and beauty, Illustration, digital art, --ar 16:9 --v 5

    `
    },
    contextStringRender: (context) => {
        return ``
    }
}

export default sidekick
