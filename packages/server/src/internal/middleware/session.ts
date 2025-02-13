import { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

import { pgPool } from '../config/database';
const PgSession = connectPgSimple(session);

const getDomainFromHostName = (hostname: string) => {
  const parts = hostname.split('.');
  if (parts.length < 2) {
    return hostname; // Return the hostname if it's already a root domain
  }
  const domain = parts.slice(1).join('.');
  return domain;
};

import { RequestHandler } from 'express';

export const sessionMiddleware: RequestHandler = session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET_KEY || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});

export const sessionHostMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const domain = getDomainFromHostName(req.hostname);
  req.session.cookie.domain = domain;
  if (req.hostname !== 'localhost') {
    req.session.cookie.secure = true;
    req.session.cookie.sameSite = 'none';
  }
  next();
};
