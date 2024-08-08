import GPT3Tokenizer from 'gpt3-tokenizer'

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })
export const countTokens = (text: string): number => {
    const encoded = tokenizer.encode(text)
    const tokensInFile = encoded.bpe.length
    return tokensInFile
}
