export const CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, answer in the same language as the follow up question. include it in the standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`

export const RESPONSE_TEMPLATE = `I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". Using the provided context, answer the user's question to the best of your ability using the resources provided.
If there is nothing in the context relevant to the question at hand, just say "Hmm, I'm not sure" and stop after that. Refuse to answer any question not about the info. Never break character.
------------
{context}
------------
REMEMBER: If there is no relevant information within the context, just say "Hmm, I'm not sure". Don't try to make up an answer. Never break character.`

export const QA_TEMPLATE = `Use the following pieces of context to answer the question at the end.

{context}

Question: {question}
Helpful Answer:`

export const REPHRASE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`
