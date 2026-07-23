import { expressRequestLogger } from '../../src/utils/logger';
import { Request, Response, NextFunction } from 'express';

function runTest() {
    const mockReq = {
        method: 'GET',
        url: '/api/v1/test-url',
        body: {},
        query: {},
        params: {},
        headers: {}
    } as Partial<Request>; // a subset of Request in TypeScript

    const mockRes = {
        status: (code: number) => { 
            console.log(`Status set to ${code}`);
            return mockRes; 
        },
        send: (responseBody: any) => {
            console.log(`Response body: ${responseBody}`);
        }
    } as Partial<Response>; // a subset of Response.

    const mockNext: NextFunction = () => console.log('next() called');

    console.log('Running Test: Should call next() for a valid API call');
    expressRequestLogger(mockReq as Request, mockRes as Response, mockNext);
}

runTest();