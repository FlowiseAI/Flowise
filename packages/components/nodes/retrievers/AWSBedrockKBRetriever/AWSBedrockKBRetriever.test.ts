/**
 * Tests for AWSBedrockKBRetriever node configuration.
 */

jest.mock('@langchain/aws', () => ({
    AmazonKnowledgeBaseRetriever: jest.fn(),
}));

jest.mock('../../../src/Interface', () => ({}));
jest.mock('../../../src/awsToolsUtils', () => ({
    getAWSCredentialConfig: jest.fn(),
}));
jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { EMBEDDING: 'EMBEDDING' },
    getRegions: jest.fn(),
}));
jest.mock('@aws-sdk/client-bedrock-agent-runtime', () => ({}));

const { nodeClass: NodeClass } = require('./AWSBedrockKBRetriever');

describe('AWSBedrockKBRetriever', () => {
    const nodeInstance = new NodeClass();

    it('should have Knowledge Base Type input', () => {
        const kbTypeInput = nodeInstance.inputs.find(
            (input: any) => input.name === 'knowledgeBaseType',
        );
        expect(kbTypeInput).toBeDefined();
        expect(kbTypeInput.type).toBe('options');
        expect(kbTypeInput.default).toBe('MANAGED');
    });

    it('should have MANAGED and VECTOR options', () => {
        const kbTypeInput = nodeInstance.inputs.find(
            (input: any) => input.name === 'knowledgeBaseType',
        );
        const optionNames = kbTypeInput.options.map((o: any) => o.name);
        expect(optionNames).toContain('MANAGED');
        expect(optionNames).toContain('VECTOR');
    });

    it('should have Knowledge Base ID input', () => {
        const kbIdInput = nodeInstance.inputs.find(
            (input: any) => input.name === 'knoledgeBaseID',
        );
        expect(kbIdInput).toBeDefined();
        expect(kbIdInput.type).toBe('string');
    });

    it('should be categorized as a Retriever', () => {
        expect(nodeInstance.category).toBe('Retrievers');
        expect(nodeInstance.baseClasses).toContain('BaseRetriever');
    });
});
