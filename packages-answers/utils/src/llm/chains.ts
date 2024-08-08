// import { LLMChain } from 'langchain';
// import { ChatOpenAI } from 'langchain/chat_models';
// import { OpenAI } from 'langchain/llms';

import { Message, User } from 'types'

import { Configuration, OpenAIApi } from 'openai'

import { rawPrompt } from './chatPrompt'
import { summarizeQAPrompt, summarizePrompt } from './summarizePrompt'
import { getCompletionRequest } from './getCompletionRequest'

const initializeOpenAI = () => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY
    })
    return new OpenAIApi(configuration)
}

export const openai = initializeOpenAI()

// const chat = new ChatOpenAI({ modelName: 'gpt-3.5-turbo-0301', temperature: 0.1 });
// const openAIModel = new OpenAI({ temperature: 0.1 });
export const createChatChain = ({ messages }: { messages?: Message[] }) => {
    // const chatHistoryPrompt = ChatPromptTemplate.fromPromptMessages([
    //   assistantPrompt,
    //   // TODO: Improve intention prompt so it doesn't mess with the user prompt
    //   // intentionPrompt,
    //   ...messages?.map((message) =>
    //     message?.role === 'assistant'
    //       ? SystemMessagePromptTemplate.fromTemplate(message.content)
    //       : HumanMessagePromptTemplate.fromTemplate(message.content)
    //   ),
    //   HumanMessagePromptTemplate.fromTemplate('{input}')
    // ]);
    // return new LLMChain({
    //   prompt: chatHistoryPrompt,
    //   llm: chat
    // });
    const chain = {
        call: async ({
            context,
            user,
            input,
            messages
        }: {
            context: string
            user?: User
            input: string
            messages?: Message[]
            agent_scratchpad: string
        }) => {
            // console.log('[ChatChain] context', context?.length);
            const completionRequest = await getCompletionRequest({ context, user, messages, input })
            // ignoring tracking for now since this is not being used
            const response = await openai.createChatCompletion(completionRequest as any)
            const text = response.data.choices[0].message?.content
            return { completionRequest, text }
        }
    }
    return chain
}

// export const summarizeChain = new LLMChain({
//   prompt: summarizePrompt,
//   llm: openAIModel
// });

// export const summarizeQAChain = new LLMChain({
//   prompt: summarizeQAPrompt,
//   llm: chat
// });

// export const rawChain = new LLMChain({
//   prompt: rawPrompt,
//   llm: chat
// });
