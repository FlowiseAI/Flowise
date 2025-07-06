import axios from 'axios'
import { ICommonObject, INodeData } from '../../../../src/Interface'

const { nodeClass } = require('../../../../nodes/agentflow/HTTP/HTTP')

// Custom mock for axios to behave like a function AND have get/post
jest.mock('axios', () => {
    const mockAxios = jest.fn() as jest.MockedFunction<any> & {
        get: jest.Mock;
        post: jest.Mock;
        request: jest.Mock;
    };
    mockAxios.get = jest.fn();
    mockAxios.post = jest.fn();
    mockAxios.request = jest.fn();
    return mockAxios;
});

const mockedAxios = axios as jest.MockedFunction<typeof axios> & {
    get: jest.Mock;
    post: jest.Mock;
    request: jest.Mock;
};

jest.mock('../../../../src/utils', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

describe('HTTP_Agentflow Node', () => {
    let node: any;

    const baseNodeData = {
        id: '1',
        label: 'HTTP Node',
        name: 'httpNode',
        type: 'http',
        icon: 'httpIcon',
        version: 1,
        category: 'HTTP',
        baseClasses: ['HTTP'],
        inputs: {
            method: 'GET',
            url: 'https://api.example.com/test'
        },
        credential: '',
        outputs: {}
    } as INodeData;

    const options = {
        agentflowRuntime: { state: {} }
    } as ICommonObject;

    beforeEach(() => {
        jest.clearAllMocks();
        node = new nodeClass();
    });

    it('should make a successful GET request', async () => {
        mockedAxios.mockResolvedValue({
            data: { success: true },
            status: 200,
            statusText: 'OK',
            headers: {}
        });

        const result = await node.run(baseNodeData, '', options);

        expect(mockedAxios).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'GET',
                url: 'https://api.example.com/test',
                headers: expect.any(Object)
            })
        );

        expect(result.output.http.data).toEqual({ success: true });
        expect(result.output.http.status).toBe(200);
    });

    it('should handle invalid JSON body with fallback', async () => {
        const nodeData = {
            ...baseNodeData,
            inputs: {
                method: 'POST',
                url: 'https://api.example.com/post',
                bodyType: 'json',
                body: '{foo:bar}' // invalid JSON
            }
        };

        await expect(node.run(nodeData, '', options)).rejects.toThrow(
            /Invalid JSON format/
        );
    });

    it('should throw an error for failed HTTP request', async () => {
        mockedAxios.mockRejectedValue({
            response: {
                status: 400,
                statusText: 'Bad Request',
                data: { error: 'Invalid input' },
                headers: {}
            },
            message: 'Request failed'
        });

        await expect(node.run(baseNodeData, '', options)).rejects.toThrow(
            'Invalid input'
        );
    });
});
