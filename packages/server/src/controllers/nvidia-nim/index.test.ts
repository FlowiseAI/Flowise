import { NextFunction, Request, Response } from 'express'
import axios from 'axios'

jest.mock('axios')
jest.mock('flowise-nim-container-manager', () => ({
    NimContainerManager: {
        preload: jest.fn(),
        downloadInstaller: jest.fn(),
        pullImage: jest.fn(),
        startContainer: jest.fn(),
        userImageLibrary: jest.fn(),
        listRunningContainers: jest.fn(),
        stopContainer: jest.fn()
    }
}))

import nvidiaNimController from '.'

const mockedAxios = axios as jest.Mocked<typeof axios>

function mockReq(): Request {
    return { body: {} } as Request
}

function mockRes(): Response {
    return {
        json: jest.fn().mockReturnThis()
    } as unknown as Response
}

describe('nvidiaNimController.getToken', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('requests an NVIDIA NIM token with a bounded timeout', async () => {
        const tokenResponse = { token: 'token-123' }
        mockedAxios.post.mockResolvedValue({ data: tokenResponse })
        const res = mockRes()
        const next = jest.fn() as NextFunction

        await nvidiaNimController.getToken(mockReq(), res, next)

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://nts.ngc.nvidia.com/v1/token',
            {
                client_id: 'Flowise',
                pdi: '0x1234567890abcdeg',
                access_policy_name: 'nim-dev'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        )
        expect(res.json).toHaveBeenCalledWith(tokenResponse)
        expect(next).not.toHaveBeenCalled()
    })

    it('passes timeout errors to the Express error handler', async () => {
        const error = new Error('timeout')
        mockedAxios.post.mockRejectedValue(error)
        const res = mockRes()
        const next = jest.fn() as NextFunction

        await nvidiaNimController.getToken(mockReq(), res, next)

        expect(mockedAxios.post).toHaveBeenCalledWith(expect.any(String), expect.any(Object), expect.objectContaining({ timeout: 10000 }))
        expect(res.json).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(error)
    })
})
