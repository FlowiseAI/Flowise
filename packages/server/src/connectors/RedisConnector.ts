import InternalFlowiseError from './errors/internalFlowiseError'
import logger from '../utils/logger'
import MODE from './../Interface'
import Redis from 'ioredis'
import StatusCodes from 'http-status-codes'

class RedisConnector {
  private redis: Redis = null;

  private constructor() {
    let keepAlive = process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
      ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
      : undefined

    let tlsOptions = process.env.REDIS_TLS === 'true'
      ? {
            cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
            key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
            ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
        }
      : undefined

    switch(process.env.MODE) {
      case MODE.QUEUE:
        this.initializeQueueMode(keepAlive, tlsOptions)
        break;
      case MODE.MAIN:
        logger.error(`[server]: MODE ${process.env.MODE} not implemented`);
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `[server]: MODE ${process.env.MODE} not implemented`);
        break;
      default:
        logger.error(`[server]: Unrecognized MODE - ${process.env.MODE}`);
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Unrecognized MODE - ${process.env.MODE}`);
    }
  }

  /**
  * Connect to Redis in Queue mode
  */
  private initializeQueueMode(keepAlive, tlsOptions) {
    if (process.env.REDIS_URL) {
      logger.info("[server] Queue mode using REDIS_URL.")
      this.redis = new Redis(process.env.REDIS_URL, {
        keepAlive: keepAlive,
        tls: tlsOptions,
        reconnectOnError: this.reconnectOnError(err)
      })

    } else if (process.env.REDIS_HOST) {
      logger.info("[server] Queue mode using REDIS_HOST.")
      this.redis = new Redis({
        host: process.env.REDIS_HOST
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        keepAlive: keepAlive,
        tls: tlsOptions,
        reconnectOnError: this.reconnectOnError(err)
      })

    } else {
      logger.info("[server] Queue mode using localhost.")
      this.redis = new Redis({
        host: 'localhost'
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        keepAlive: keepAlive,
        tls: tlsOptions,
        reconnectOnError: this.reconnectOnError(err)
      })
    }
  }

  /**
  * Always reconnect to Redis in case of errors (does not retry the failed command)
  * https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html#reconnectOnError
  */
  private connectOnError(err) : number {
    logger.error(`[server]: Redis connection error - ${err.message}`);
    return 1;
  }

  public get() : Redis {
    return this.redis;
  }
}
