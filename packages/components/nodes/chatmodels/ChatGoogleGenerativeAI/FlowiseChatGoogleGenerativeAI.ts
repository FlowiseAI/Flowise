import {
    GenerativeModel,
    GoogleGenerativeAI as GenerativeAI,
    FunctionDeclarationsTool as GoogleGenerativeAIFunctionDeclarationsTool,
    FunctionDeclaration as GenerativeAIFunctionDeclaration,
    type FunctionDeclarationSchema as GenerativeAIFunctionDeclarationSchema,
    GenerateContentRequest,
    SafetySetting,
    Part as GenerativeAIPart,
    ModelParams,
    RequestOptions,
    type CachedContent,
    Schema
} from '@google/generative-ai'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { AIMessageChunk, BaseMessage, UsageMetadata } from '@langchain/core/messages'
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import { getEnvironmentVariable } from '@langchain/core/utils/env'
import {
    BaseChatModel,
    type BaseChatModelCallOptions,
    type LangSmithParams,
    type BaseChatModelParams
} from '@langchain/core/language_models/chat_models'
import { NewTokenIndices } from '@langchain/core/callbacks/base'
import { BaseLanguageModelInput, StructuredOutputMethodOptions } from '@langchain/core/language_models/base'
import { Runnable, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { InferInteropZodOutput, InteropZodType, isInteropZodSchema } from '@langchain/core/utils/types'
import { BaseLLMOutputParser, JsonOutputParser } from '@langchain/core/output_parsers'
import { schemaToGenerativeAIParameters, removeAdditionalProperties } from './utils/zod_to_genai_parameters.js'
import {
    convertBaseMessagesToContent,
    convertResponseContentToChatGenerationChunk,
    mapGenerateContentResultToChatResult
} from './utils/common.js'
import { GoogleGenerativeAIToolsOutputParser } from './utils/output_parsers.js'
import { GoogleGenerativeAIToolType } from './utils/types.js'
import { convertToolsToGenAI } from './utils/tools.js'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

interface TokenUsage {
    completionTokens?: number
    promptTokens?: number
    totalTokens?: number
}

export type BaseMessageExamplePair = {
    input: BaseMessage
    output: BaseMessage
}

export interface GoogleGenerativeAIChatCallOptions extends BaseChatModelCallOptions {
    tools?: GoogleGenerativeAIToolType[]
    /**
     * Allowed functions to call when the mode is "any".
     * If empty, any one of the provided functions are called.
     */
    allowedFunctionNames?: string[]
    /**
     * Whether or not to include usage data, like token counts
     * in the streamed response chunks.
     * @default true
     */
    streamUsage?: boolean

    /**
     * JSON schema to be returned by the model.
     */
    responseSchema?: Schema
}

/**
 * An interface defining the input to the ChatGoogleGenerativeAI class.
 */
export interface GoogleGenerativeAIChatInput extends BaseChatModelParams, Pick<GoogleGenerativeAIChatCallOptions, 'streamUsage'> {
    /**
     * Model Name to use
     *
     * Note: The format must follow the pattern - `{model}`
     */
    model: string

    /**
     * Controls the randomness of the output.
     *
     * Values can range from [0.0,2.0], inclusive. A value closer to 2.0
     * will produce responses that are more varied and creative, while
     * a value closer to 0.0 will typically result in less surprising
     * responses from the model.
     *
     * Note: The default value varies by model
     */
    temperature?: number

    /**
     * Maximum number of tokens to generate in the completion.
     */
    maxOutputTokens?: number

    /**
     * Top-p changes how the model selects tokens for output.
     *
     * Tokens are selected from most probable to least until the sum
     * of their probabilities equals the top-p value.
     *
     * For example, if tokens A, B, and C have a probability of
     * .3, .2, and .1 and the top-p value is .5, then the model will
     * select either A or B as the next token (using temperature).
     *
     * Note: The default value varies by model
     */
    topP?: number

    /**
     * Top-k changes how the model selects tokens for output.
     *
     * A top-k of 1 means the selected token is the most probable among
     * all tokens in the model's vocabulary (also called greedy decoding),
     * while a top-k of 3 means that the next token is selected from
     * among the 3 most probable tokens (using temperature).
     *
     * Note: The default value varies by model
     */
    topK?: number

    /**
     * The set of character sequences (up to 5) that will stop output generation.
     * If specified, the API will stop at the first appearance of a stop
     * sequence.
     *
     * Note: The stop sequence will not be included as part of the response.
     * Note: stopSequences is only supported for Gemini models
     */
    stopSequences?: string[]

    /**
     * A list of unique `SafetySetting` instances for blocking unsafe content. The API will block
     * any prompts and responses that fail to meet the thresholds set by these settings. If there
     * is no `SafetySetting` for a given `SafetyCategory` provided in the list, the API will use
     * the default safety setting for that category.
     */
    safetySettings?: SafetySetting[]

    /**
     * Google API key to use
     */
    apiKey?: string

    /**
     * Google API version to use
     */
    apiVersion?: string

    /**
     * Google API base URL to use
     */
    baseUrl?: string

    /** Whether to stream the results or not */
    streaming?: boolean

    /**
     * Whether or not to force the model to respond with JSON.
     * Available for `gemini-1.5` models and later.
     * @default false
     */
    json?: boolean

    /**
     * Whether or not model supports system instructions.
     * The following models support system instructions:
     * - All Gemini 1.5 Pro model versions
     * - All Gemini 1.5 Flash model versions
     * - Gemini 1.0 Pro version gemini-1.0-pro-002
     */
    convertSystemMessageToHumanContent?: boolean | undefined

    /** Thinking budget for Gemini 2.5 thinking models. Supports -1 (dynamic), 0 (off), or positive integers. */
    thinkingBudget?: number
}

/**
 * Google Generative AI chat model integration.
 *
 * Setup:
 * Install `@langchain/google-genai` and set an environment variable named `GOOGLE_API_KEY`.
 *
 * ```bash
 * npm install @langchain/google-genai
 * export GOOGLE_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_google_genai.ChatGoogleGenerativeAI.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_google_genai.GoogleGenerativeAIChatCallOptions.html)
 *
 * Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
 * They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
 *
 * ```typescript
 * // When calling `.withConfig`, call options should be passed via the first argument
 * const llmWithArgsBound = llm.withConfig({
 *   stop: ["\n"],
 * });
 *
 * // When calling `.bindTools`, call options should be passed via the second argument
 * const llmWithTools = llm.bindTools(
 *   [...],
 *   {
 *     stop: ["\n"],
 *   }
 * );
 * ```
 *
 * ## Examples
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
 *
 * const llm = new ChatGoogleGenerativeAI({
 *   model: "gemini-1.5-flash",
 *   temperature: 0,
 *   maxRetries: 2,
 *   // apiKey: "...",
 *   // other params...
 * });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Invoking</strong></summary>
 *
 * ```typescript
 * const input = `Translate "I love programming" into French.`;
 *
 * // Models also accept a list of chat messages or a formatted prompt
 * const result = await llm.invoke(input);
 * console.log(result);
 * ```
 *
 * ```txt
 * AIMessage {
 *   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
 *   "response_metadata": {
 *     "finishReason": "STOP",
 *     "index": 0,
 *     "safetyRatings": [
 *       {
 *         "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_HATE_SPEECH",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_HARASSMENT",
 *         "probability": "NEGLIGIBLE"
 *       },
 *       {
 *         "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
 *         "probability": "NEGLIGIBLE"
 *       }
 *     ]
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 149,
 *     "total_tokens": 159
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Streaming Chunks</strong></summary>
 *
 * ```typescript
 * for await (const chunk of await llm.stream(input)) {
 *   console.log(chunk);
 * }
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "content": "There",
 *   "response_metadata": {
 *     "index": 0
 *   }
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 1,
 *     "total_tokens": 11
 *   }
 * }
 * AIMessageChunk {
 *   "content": " are a few ways to translate \"I love programming\" into French, depending on",
 * }
 * AIMessageChunk {
 *   "content": " the level of formality and nuance you want to convey:\n\n**Formal:**\n\n",
 * }
 * AIMessageChunk {
 *   "content": "* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This",
 * }
 * AIMessageChunk {
 *   "content": " is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More",
 * }
 * AIMessageChunk {
 *   "content": " specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and",
 * }
 * AIMessageChunk {
 *   "content": " your intended audience. \n",
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Aggregate Streamed Chunks</strong></summary>
 *
 * ```typescript
 * import { AIMessageChunk } from '@langchain/core/messages';
 * import { concat } from '@langchain/core/utils/stream';
 *
 * const stream = await llm.stream(input);
 * let full: AIMessageChunk | undefined;
 * for await (const chunk of stream) {
 *   full = !full ? chunk : concat(full, chunk);
 * }
 * console.log(full);
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
 *   "usage_metadata": {
 *     "input_tokens": 10,
 *     "output_tokens": 277,
 *     "total_tokens": 287
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Bind tools</strong></summary>
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * const GetWeather = {
 *   name: "GetWeather",
 *   description: "Get the current weather in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const GetPopulation = {
 *   name: "GetPopulation",
 *   description: "Get the current population in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const llmWithTools = llm.bindTools([GetWeather, GetPopulation]);
 * const aiMsg = await llmWithTools.invoke(
 *   "Which city is hotter today and which is bigger: LA or NY?"
 * );
 * console.log(aiMsg.tool_calls);
 * ```
 *
 * ```txt
 * [
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call'
 *   }
 * ]
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Structured Output</strong></summary>
 *
 * ```typescript
 * const Joke = z.object({
 *   setup: z.string().describe("The setup of the joke"),
 *   punchline: z.string().describe("The punchline to the joke"),
 *   rating: z.number().optional().describe("How funny the joke is, from 1 to 10")
 * }).describe('Joke to tell user.');
 *
 * const structuredLlm = llm.withStructuredOutput(Joke, { name: "Joke" });
 * const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
 * console.log(jokeResult);
 * ```
 *
 * ```txt
 * {
 *   setup: "Why don\\'t cats play poker?",
 *   punchline: "Why don\\'t cats play poker? Because they always have an ace up their sleeve!"
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Multimodal</strong></summary>
 *
 * ```typescript
 * import { HumanMessage } from '@langchain/core/messages';
 *
 * const imageUrl = "https://example.com/image.jpg";
 * const imageData = await fetch(imageUrl).then(res => res.arrayBuffer());
 * const base64Image = Buffer.from(imageData).toString('base64');
 *
 * const message = new HumanMessage({
 *   content: [
 *     { type: "text", text: "describe the weather in this image" },
 *     {
 *       type: "image_url",
 *       image_url: { url: `data:image/jpeg;base64,${base64Image}` },
 *     },
 *   ]
 * });
 *
 * const imageDescriptionAiMsg = await llm.invoke([message]);
 * console.log(imageDescriptionAiMsg.content);
 * ```
 *
 * ```txt
 * The weather in the image appears to be clear and sunny. The sky is mostly blue with a few scattered white clouds, indicating fair weather. The bright sunlight is casting shadows on the green, grassy hill, suggesting it is a pleasant day with good visibility. There are no signs of rain or stormy conditions.
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Usage Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForMetadata = await llm.invoke(input);
 * console.log(aiMsgForMetadata.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 10, output_tokens: 149, total_tokens: 159 }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Response Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForResponseMetadata = await llm.invoke(input);
 * console.log(aiMsgForResponseMetadata.response_metadata);
 * ```
 *
 * ```txt
 * {
 *   finishReason: 'STOP',
 *   index: 0,
 *   safetyRatings: [
 *     {
 *       category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
 *       probability: 'NEGLIGIBLE'
 *     },
 *     {
 *       category: 'HARM_CATEGORY_HATE_SPEECH',
 *       probability: 'NEGLIGIBLE'
 *     },
 *     { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
 *     {
 *       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
 *       probability: 'NEGLIGIBLE'
 *     }
 *   ]
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Document Messages</strong></summary>
 *
 * This example will show you how to pass documents such as PDFs to Google
 * Generative AI through messages.
 *
 * ```typescript
 * const pdfPath = "/Users/my_user/Downloads/invoice.pdf";
 * const pdfBase64 = await fs.readFile(pdfPath, "base64");
 *
 * const response = await llm.invoke([
 *   ["system", "Use the provided documents to answer the question"],
 *   [
 *     "user",
 *     [
 *       {
 *         type: "application/pdf", // If the `type` field includes a single slash (`/`), it will be treated as inline data.
 *         data: pdfBase64,
 *       },
 *       {
 *         type: "text",
 *         text: "Summarize the contents of this PDF",
 *       },
 *     ],
 *   ],
 * ]);
 *
 * console.log(response.content);
 * ```
 *
 * ```txt
 * This is a billing invoice from Twitter Developers for X API Basic Access. The transaction date is January 7, 2025,
 * and the amount is $194.34, which has been paid. The subscription period is from January 7, 2025 21:02 to February 7, 2025 00:00 (UTC).
 * The tax is $0.00, with a tax rate of 0%. The total amount is $194.34. The payment was made using a Visa card ending in 7022,
 * expiring in 12/2026. The billing address is Brace Sproul, 1234 Main Street, San Francisco, CA, US 94103. The company being billed is
 * X Corp, located at 865 FM 1209 Building 2, Bastrop, TX, US 78602. Terms and conditions apply.
 * ```
 * </details>
 *
 * <br />
 */
export class LangchainChatGoogleGenerativeAI
    extends BaseChatModel<GoogleGenerativeAIChatCallOptions, AIMessageChunk>
    implements GoogleGenerativeAIChatInput
{
    static lc_name() {
        return 'ChatGoogleGenerativeAI'
    }

    lc_serializable = true

    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            apiKey: 'GOOGLE_API_KEY'
        }
    }

    lc_namespace = ['langchain', 'chat_models', 'google_genai']

    get lc_aliases() {
        return {
            apiKey: 'google_api_key'
        }
    }

    model: string

    temperature?: number // default value chosen based on model

    maxOutputTokens?: number

    topP?: number // default value chosen based on model

    topK?: number // default value chosen based on model

    stopSequences: string[] = []

    safetySettings?: SafetySetting[]

    apiKey?: string

    streaming = false

    json?: boolean

    streamUsage = true

    convertSystemMessageToHumanContent: boolean | undefined

    thinkingBudget?: number

    private client: GenerativeModel

    get _isMultimodalModel() {
        return (
            this.model.includes('vision') ||
            this.model.startsWith('gemini-1.5') ||
            this.model.startsWith('gemini-2') ||
            this.model.startsWith('gemini-3')
        )
    }

    constructor(fields: GoogleGenerativeAIChatInput) {
        super(fields)

        this.model = fields.model.replace(/^models\//, '')

        this.maxOutputTokens = fields.maxOutputTokens ?? this.maxOutputTokens

        if (this.maxOutputTokens && this.maxOutputTokens < 0) {
            throw new Error('`maxOutputTokens` must be a positive integer')
        }

        this.temperature = fields.temperature ?? this.temperature
        if (this.temperature && (this.temperature < 0 || this.temperature > 2)) {
            throw new Error('`temperature` must be in the range of [0.0,2.0]')
        }

        this.topP = fields.topP ?? this.topP
        if (this.topP && this.topP < 0) {
            throw new Error('`topP` must be a positive integer')
        }

        if (this.topP && this.topP > 1) {
            throw new Error('`topP` must be below 1.')
        }

        this.topK = fields.topK ?? this.topK
        if (this.topK && this.topK < 0) {
            throw new Error('`topK` must be a positive integer')
        }

        this.stopSequences = fields.stopSequences ?? this.stopSequences

        this.apiKey = fields.apiKey ?? getEnvironmentVariable('GOOGLE_API_KEY')
        if (!this.apiKey) {
            throw new Error(
                'Please set an API key for Google GenerativeAI ' +
                    'in the environment variable GOOGLE_API_KEY ' +
                    'or in the `apiKey` field of the ' +
                    'ChatGoogleGenerativeAI constructor'
            )
        }

        this.safetySettings = fields.safetySettings ?? this.safetySettings
        if (this.safetySettings && this.safetySettings.length > 0) {
            const safetySettingsSet = new Set(this.safetySettings.map((s) => s.category))
            if (safetySettingsSet.size !== this.safetySettings.length) {
                throw new Error('The categories in `safetySettings` array must be unique')
            }
        }

        this.streaming = fields.streaming ?? this.streaming
        this.json = fields.json
        this.thinkingBudget = fields.thinkingBudget

        this.client = new GenerativeAI(this.apiKey).getGenerativeModel(
            {
                model: this.model,
                safetySettings: this.safetySettings as SafetySetting[],
                generationConfig: {
                    stopSequences: this.stopSequences,
                    maxOutputTokens: this.maxOutputTokens,
                    temperature: this.temperature,
                    topP: this.topP,
                    topK: this.topK,
                    ...(this.json ? { responseMimeType: 'application/json' } : {})
                }
            },
            {
                apiVersion: fields.apiVersion,
                baseUrl: fields.baseUrl
            }
        )
        if (this.thinkingBudget !== undefined) {
            ;(this.client.generationConfig as any).thinkingConfig = {
                ...(this.thinkingBudget !== undefined ? { thinkingBudget: this.thinkingBudget } : {})
            }
        }
        this.streamUsage = fields.streamUsage ?? this.streamUsage
    }

    useCachedContent(cachedContent: CachedContent, modelParams?: ModelParams, requestOptions?: RequestOptions): void {
        if (!this.apiKey) return
        this.client = new GenerativeAI(this.apiKey).getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions)
        if (this.thinkingBudget !== undefined) {
            ;(this.client.generationConfig as any).thinkingConfig = {
                ...(this.thinkingBudget !== undefined ? { thinkingBudget: this.thinkingBudget } : {})
            }
        }
    }

    get useSystemInstruction(): boolean {
        return typeof this.convertSystemMessageToHumanContent === 'boolean'
            ? !this.convertSystemMessageToHumanContent
            : this.computeUseSystemInstruction
    }

    get computeUseSystemInstruction(): boolean {
        // This works on models from April 2024 and later
        //   Vertex AI: gemini-1.5-pro and gemini-1.0-002 and later
        //   AI Studio: gemini-1.5-pro-latest
        if (this.model === 'gemini-1.0-pro-001') {
            return false
        } else if (this.model.startsWith('gemini-pro-vision')) {
            return false
        } else if (this.model.startsWith('gemini-1.0-pro-vision')) {
            return false
        } else if (this.model === 'gemini-pro') {
            // on AI Studio gemini-pro is still pointing at gemini-1.0-pro-001
            return false
        }
        return true
    }

    getLsParams(options: this['ParsedCallOptions']): LangSmithParams {
        return {
            ls_provider: 'google_genai',
            ls_model_name: this.model,
            ls_model_type: 'chat',
            ls_temperature: this.client.generationConfig.temperature,
            ls_max_tokens: this.client.generationConfig.maxOutputTokens,
            ls_stop: options.stop
        }
    }

    _combineLLMOutput() {
        return []
    }

    _llmType() {
        return 'googlegenerativeai'
    }

    override bindTools(
        tools: GoogleGenerativeAIToolType[],
        kwargs?: Partial<GoogleGenerativeAIChatCallOptions>
    ): Runnable<BaseLanguageModelInput, AIMessageChunk, GoogleGenerativeAIChatCallOptions> {
        return this.withConfig({
            tools: convertToolsToGenAI(tools)?.tools,
            ...kwargs
        })
    }

    invocationParams(options?: this['ParsedCallOptions']): Omit<GenerateContentRequest, 'contents'> {
        const toolsAndConfig = options?.tools?.length
            ? convertToolsToGenAI(options.tools, {
                  toolChoice: options.tool_choice,
                  allowedFunctionNames: options.allowedFunctionNames
              })
            : undefined

        if (options?.responseSchema) {
            this.client.generationConfig.responseSchema = options.responseSchema
            this.client.generationConfig.responseMimeType = 'application/json'
        } else {
            this.client.generationConfig.responseSchema = undefined
            this.client.generationConfig.responseMimeType = this.json ? 'application/json' : undefined
        }

        return {
            ...(toolsAndConfig?.tools ? { tools: toolsAndConfig.tools } : {}),
            ...(toolsAndConfig?.toolConfig ? { toolConfig: toolsAndConfig.toolConfig } : {})
        }
    }

    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel, this.useSystemInstruction)
        let actualPrompt = prompt
        if (prompt[0].role === 'system') {
            const [systemInstruction] = prompt
            this.client.systemInstruction = systemInstruction
            actualPrompt = prompt.slice(1)
        }

        // Ensure actualPrompt is never empty
        if (actualPrompt.length === 0) {
            actualPrompt = [{ role: 'user', parts: [{ text: '...' }] }]
        }

        const parameters = this.invocationParams(options)

        // Handle streaming
        if (this.streaming) {
            const tokenUsage: TokenUsage = {}
            const stream = this._streamResponseChunks(messages, options, runManager)
            const finalChunks: Record<number, ChatGenerationChunk> = {}

            for await (const chunk of stream) {
                const index = (chunk.generationInfo as NewTokenIndices)?.completion ?? 0
                if (finalChunks[index] === undefined) {
                    finalChunks[index] = chunk
                } else {
                    finalChunks[index] = finalChunks[index].concat(chunk)
                }
            }
            const generations = Object.entries(finalChunks)
                .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
                .map(([_, value]) => value)

            return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } }
        }

        const res = await this.completionWithRetry({
            ...parameters,
            contents: actualPrompt
        })

        let usageMetadata: UsageMetadata | undefined
        if ('usageMetadata' in res.response) {
            const genAIUsageMetadata = res.response.usageMetadata as {
                promptTokenCount: number | undefined
                candidatesTokenCount: number | undefined
                totalTokenCount: number | undefined
            }
            usageMetadata = {
                input_tokens: genAIUsageMetadata.promptTokenCount ?? 0,
                output_tokens: genAIUsageMetadata.candidatesTokenCount ?? 0,
                total_tokens: genAIUsageMetadata.totalTokenCount ?? 0
            }
        }

        const generationResult = mapGenerateContentResultToChatResult(res.response, {
            usageMetadata
        })
        // may not have generations in output if there was a refusal for safety reasons, malformed function call, etc.
        if (generationResult.generations?.length > 0) {
            await runManager?.handleLLMNewToken(generationResult.generations[0]?.text ?? '')
        }
        return generationResult
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel, this.useSystemInstruction)
        let actualPrompt = prompt
        if (prompt[0].role === 'system') {
            const [systemInstruction] = prompt
            this.client.systemInstruction = systemInstruction
            actualPrompt = prompt.slice(1)
        }

        // Ensure actualPrompt is never empty
        if (actualPrompt.length === 0) {
            actualPrompt = [{ role: 'user', parts: [{ text: '...' }] }]
        }

        const parameters = this.invocationParams(options)
        const request = {
            ...parameters,
            contents: actualPrompt
        }
        const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
            const { stream } = await this.client.generateContentStream(request)
            return stream
        })

        let usageMetadata: UsageMetadata | undefined
        let index = 0
        for await (const response of stream) {
            if ('usageMetadata' in response && this.streamUsage !== false && options.streamUsage !== false) {
                const genAIUsageMetadata = response.usageMetadata as {
                    promptTokenCount: number | undefined
                    candidatesTokenCount: number | undefined
                    totalTokenCount: number | undefined
                }
                if (!usageMetadata) {
                    usageMetadata = {
                        input_tokens: genAIUsageMetadata.promptTokenCount ?? 0,
                        output_tokens: genAIUsageMetadata.candidatesTokenCount ?? 0,
                        total_tokens: genAIUsageMetadata.totalTokenCount ?? 0
                    }
                } else {
                    // Under the hood, LangChain combines the prompt tokens. Google returns the updated
                    // total each time, so we need to find the difference between the tokens.
                    const outputTokenDiff = (genAIUsageMetadata.candidatesTokenCount ?? 0) - usageMetadata.output_tokens
                    usageMetadata = {
                        input_tokens: 0,
                        output_tokens: outputTokenDiff,
                        total_tokens: outputTokenDiff
                    }
                }
            }

            const chunk = convertResponseContentToChatGenerationChunk(response, {
                usageMetadata,
                index
            })
            index += 1
            if (!chunk) {
                continue
            }

            yield chunk
            await runManager?.handleLLMNewToken(chunk.text ?? '')
        }
    }

    async completionWithRetry(
        request: string | GenerateContentRequest | (string | GenerativeAIPart)[],
        options?: this['ParsedCallOptions']
    ) {
        return this.caller.callWithOptions({ signal: options?.signal }, async () => {
            try {
                return await this.client.generateContent(request)
            } catch (e: any) {
                // TODO: Improve error handling
                if (e.message?.includes('400 Bad Request')) {
                    e.status = 400
                }
                throw e
            }
        })
    }

    // eslint-disable-next-line
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
        outputSchema: InteropZodType<RunOutput> | Record<string, any>,
        config?: StructuredOutputMethodOptions<false>
    ): Runnable<BaseLanguageModelInput, RunOutput>

    // eslint-disable-next-line
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
        outputSchema: InteropZodType<RunOutput> | Record<string, any>,
        config?: StructuredOutputMethodOptions<true>
    ): Runnable<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }>

    // eslint-disable-next-line
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
        outputSchema: InteropZodType<RunOutput> | Record<string, any>,
        config?: StructuredOutputMethodOptions<boolean>
    ): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }> {
        const schema: InteropZodType<RunOutput> | Record<string, any> = outputSchema
        const name = config?.name
        const method = config?.method
        const includeRaw = config?.includeRaw
        if (method === 'jsonMode') {
            throw new Error(`ChatGoogleGenerativeAI only supports "jsonSchema" or "functionCalling" as a method.`)
        }

        let llm
        let outputParser: BaseLLMOutputParser<RunOutput>
        if (method === 'functionCalling') {
            let functionName = name ?? 'extract'
            let tools: GoogleGenerativeAIFunctionDeclarationsTool[]
            if (isInteropZodSchema(schema)) {
                const jsonSchema = schemaToGenerativeAIParameters(schema)
                tools = [
                    {
                        functionDeclarations: [
                            {
                                name: functionName,
                                description: jsonSchema.description ?? 'A function available to call.',
                                parameters: jsonSchema as GenerativeAIFunctionDeclarationSchema
                            }
                        ]
                    }
                ]
                outputParser = new GoogleGenerativeAIToolsOutputParser<InferInteropZodOutput<typeof schema>>({
                    returnSingle: true,
                    keyName: functionName,
                    zodSchema: schema
                })
            } else {
                let geminiFunctionDefinition: GenerativeAIFunctionDeclaration
                if (typeof schema.name === 'string' && typeof schema.parameters === 'object' && schema.parameters != null) {
                    geminiFunctionDefinition = schema as GenerativeAIFunctionDeclaration
                    geminiFunctionDefinition.parameters = removeAdditionalProperties(
                        schema.parameters
                    ) as GenerativeAIFunctionDeclarationSchema
                    functionName = schema.name
                } else {
                    geminiFunctionDefinition = {
                        name: functionName,
                        description: schema.description ?? '',
                        parameters: removeAdditionalProperties(schema) as GenerativeAIFunctionDeclarationSchema
                    }
                }
                tools = [
                    {
                        functionDeclarations: [geminiFunctionDefinition]
                    }
                ]
                outputParser = new GoogleGenerativeAIToolsOutputParser<RunOutput>({
                    returnSingle: true,
                    keyName: functionName
                })
            }
            llm = this.bindTools(tools).withConfig({
                allowedFunctionNames: [functionName]
            })
        } else {
            const jsonSchema = schemaToGenerativeAIParameters(schema)
            llm = this.withConfig({
                responseSchema: jsonSchema as Schema
            })
            outputParser = new JsonOutputParser()
        }

        if (!includeRaw) {
            return llm.pipe(outputParser).withConfig({
                runName: 'ChatGoogleGenerativeAIStructuredOutput'
            }) as Runnable<BaseLanguageModelInput, RunOutput>
        }

        const parserAssign = RunnablePassthrough.assign({
            parsed: (input: any, config) => outputParser.invoke(input.raw, config)
        })
        const parserNone = RunnablePassthrough.assign({
            parsed: () => null
        })
        const parsedWithFallback = parserAssign.withFallbacks({
            fallbacks: [parserNone]
        })
        return RunnableSequence.from<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }>([
            {
                raw: llm
            },
            parsedWithFallback
        ]).withConfig({
            runName: 'StructuredOutputRunnable'
        })
    }
}

export class ChatGoogleGenerativeAI extends LangchainChatGoogleGenerativeAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: GoogleGenerativeAIChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
        this.configuredMaxToken = fields?.maxOutputTokens
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
