export function parsePrompt(prompt: string): any[] {
    const promptObj = JSON.parse(prompt)
    let response = []
    if (promptObj.kwargs.messages) {
        promptObj.kwargs.messages.forEach((message: any) => {
            let messageType = message.id.includes('SystemMessagePromptTemplate')
                ? 'systemMessagePrompt'
                : message.id.includes('HumanMessagePromptTemplate')
                ? 'humanMessagePrompt'
                : message.id.includes('AIMessagePromptTemplate')
                ? 'aiMessagePrompt'
                : 'template'
            let messageTypeDisplay = message.id.includes('SystemMessagePromptTemplate')
                ? 'System Message'
                : message.id.includes('HumanMessagePromptTemplate')
                ? 'Human Message'
                : message.id.includes('AIMessagePromptTemplate')
                ? 'AI Message'
                : 'Message'
            let template = message.kwargs.prompt.kwargs.template
            response.push({
                type: messageType,
                typeDisplay: messageTypeDisplay,
                template: template
            })
        })
    } else if (promptObj.kwargs.template) {
        let template = promptObj.kwargs.template
        response.push({
            type: 'template',
            typeDisplay: 'Prompt',
            template: template
        })
    }
    return response
}
