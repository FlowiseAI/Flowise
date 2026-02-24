import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'

export class ChannelError extends InternalFlowiseError {
    constructor(statusCode: number, message: string) {
        super(statusCode, message)
    }
}

export class ChannelConfigurationError extends ChannelError {
    constructor(message: string) {
        super(StatusCodes.INTERNAL_SERVER_ERROR, message)
    }
}

export class ChannelValidationError extends ChannelError {
    constructor(message: string) {
        super(StatusCodes.BAD_REQUEST, message)
    }
}

export class ChannelAuthenticationError extends ChannelError {
    constructor(message: string = 'Invalid channel signature') {
        super(StatusCodes.UNAUTHORIZED, message)
    }
}

export class ChannelAdapterNotFoundError extends ChannelError {
    constructor(provider: string) {
        super(StatusCodes.NOT_FOUND, `Channel adapter not found for provider: ${provider}`)
    }
}
