import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { randomUUID } from 'crypto'
import { openai } from './openai/client'
import { Document } from 'langchain/document'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))

// const summarizeModel = 'text-embedding-ada-002'
const finalSummaryModel = 'text-davinci-003'
const summarizeModel = 'text-davinci-003'
// const finalSummaryModel = 'text-embedding-ada-002';
export const summarizeAI = async ({
    input,
    prompt,
    chunkSize = 4000, // 7000 is the max for openai,
    maxTokens = 1000,
    id
}: {
    input: string
    prompt?: string
    chunkSize?: number
    max_recurse?: number
    maxTokens?: number
    id?: string
}): Promise<string> => {
    if (!id) {
        id = randomUUID()
        // console.time(`[summarizeAI] ${id} - Done`);
    }
    if (!input) return input
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize })
    let inputDocs: Document[]
    try {
        inputDocs = await textSplitter.createDocuments([input])
    } catch (err) {
        // console.log(err);
        inputDocs = []
    }
    // console.log(`[summarizeAI] ${id} - chunkSize: ${chunkSize} - ${inputDocs.length} chunks`);
    if (inputDocs.length > 1) {
        const summariesPromises = inputDocs?.map(async (doc, idx) => {
            let summary = ''
            await sleep(100 * idx)
            // const promptWrapper = `${prompt} <INPUT>${doc.pageContent}<INPUT> Summary:`;
            const promptWrapper = `Use the following portion of a long document to see if any of the text is relevant to answer the question. \nReturn any relevant text verbatim.\n\nDocument:${doc.pageContent}\n\n\nQuestion: ${prompt}\nRelevant text, if any:`
            const res = await openai.createCompletion({
                max_tokens: maxTokens,
                prompt: promptWrapper,
                temperature: 0.1,
                model: summarizeModel
            })
            if (res?.data?.choices?.[0]?.text) {
                summary = res?.data?.choices?.[0]?.text!
            }

            return summary
        })
        const summaries = await Promise.all(summariesPromises)
        const summaryText = summaries?.join('<SEP>')
        try {
            const summaryDocs = await textSplitter.createDocuments([summaryText])
            if (summaryDocs.length === 1) {
                // console.timeEnd(`[summarizeAI] ${id} - Done`);
                return summaryText
            } else {
                return summarizeAI({
                    input: summaryText,
                    prompt,
                    chunkSize,
                    id
                })
            }
        } catch (error: any) {
            return summaryText
        }
    }
    // console.log('[summarizeAI] - No chunks');
    // console.timeEnd(`[summarizeAI] ${id} - Done`);
    return input
}
