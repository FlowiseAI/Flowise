export const evaluationPrompts = [
    {
        name: 'correctness',
        label: 'Correctness',
        json: [{ id: 1, property: 'score', description: 'graded score', type: 'number', required: true }],
        prompt: `Respond with a numeric score based on how well the following response compare to the ground truth. Grade only based expected response:

Ground Truth: {expectedOutput}

DATA:
---------
Response: {actualOutput}
---------

Do not include any other information in your response. Do not evaluate correctness to the question, only match it to the reference. It is very critical that you answer only with a numeric score. Is the assistants answer grounded in and similar to the ground truth answer? A score of 1 means that the assistant answer is not at all grounded in the ground truth answer, while a score of 5 means that the assistant answer contains some information that is grounded in and similar to the ground truth answer. A score of 10 means that the assistant answer is fully ground and similar to the ground truth answer. Please provide a score between 1 and 10. Do not generate any newlines in the response.`
    },
    {
        name: 'hallucination',
        label: 'Hallucination',
        json: [
            { id: 1, property: 'score', description: 'provide a score between 0 and 1', type: 'number', required: true },
            { id: 2, property: 'reasoning', description: 'provide a one sentence reasoning', type: 'string', required: true }
        ],
        prompt: `Evaluate the degree of hallucination in the generation on a continuous scale from 0 to 1. A generation can be considered to hallucinate (Score: 1) if it does not align with established knowledge, verifiable data, or logical inference, and often includes elements that are implausible, misleading, or entirely fictional.\n\nExample:\nQuery: Can eating carrots improve your vision?\nGeneration: Yes, eating carrots significantly improves your vision, especially at night. This is why people who eat lots of carrots never need glasses. Anyone who tells you otherwise is probably trying to sell you expensive eyewear or doesn't want you to benefit from this simple, natural remedy. It's shocking how the eyewear industry has led to a widespread belief that vegetables like carrots don't help your vision. People are so gullible to fall for these money-making schemes.\n\nScore: 1.0\nReasoning: Carrots only improve vision under specific circumstances, namely a lack of vitamin A that leads to decreased vision. Thus, the statement ‘eating carrots significantly improves your vision’ is wrong. Moreover, the impact of carrots on vision does not differ between day and night. So also the clause ‘especially is night’ is wrong. Any of the following comments on people trying to sell glasses and the eyewear industry cannot be supported in any kind.\n\nInput:\nQuery: {question}\nGeneration: {actualOutput}\n\nThink step by step.`
    }
]
