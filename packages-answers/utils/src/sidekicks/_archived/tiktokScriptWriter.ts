import { Sidekick } from 'types'
const sidekick: Sidekick = {
    departments: [
        'marketing',
        'sales',
        'customer support',
        'engineering',
        'product management',
        'legal',
        'hr',
        'education',
        'real estate',
        'administrative',
        'leadership'
    ],
    label: 'Tiktok Script Writer',
    value: 'tiktokScriptWriter',
    placeholder: 'I can help you write a script for a tiktok video. Just give me a topic',
    getSystemPromptTemplate: (user) => {
        return `
    You are an AI assistant that is specifically designed to create scripts for short attention grabbing videos.  
    `
    },
    getUserPromptTemplate: (query, context) => {
        return `
    I want you to use this context:
    ###
    ${context}
    ###

    To help the user write a script for a tiktok video.
    
    ${query}
    Use these as examples:
    There's thousands of AI tools out there. Most of them are trash, but here are six free tools I wish I knew about earlier. First is remove.bg, hands down the easiest way to remove the background from a photo. I use their Figma plugin like 20 times per day. Second is chat.pdf. You can upload a full-length PDF and then ask it questions. I like to have it summarize long research papers and then explain it back to me like I'm five years old. Third is lalul. You can take any song and isolate the vocals and the instrumental beat. I use this to make songs for videos and vocal sound effects. Fourth is upscale.media. I use a lot of images from the internet in my content, and a lot of them are fuzzy when I scale them to fit the screen. Upscale uses AI to bring back the sharpness in the image at larger sizes. Fifth is Adobe Speech Enhancer. This one has saved me a couple times. Upload any audio and it will make it sound studio quality, removing the reverb and the background noise. And sixth is colorize. This lets you turn old black and white photos into color. This will freak out your grandparents, so try it with them.
    `
    },
    contextStringRender: (context) => {
        return ``
    }
}

export default sidekick
