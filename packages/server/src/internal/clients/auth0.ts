import express, { Response } from 'express';
import dotenv from 'dotenv';
import { getAuth0Token, getAuth0UserInfo } from '../auth/helpers';
dotenv.config();
const router: express.Router = express.Router();
const routePath = 'auth';
const PORT = process.env.PORT || 3000;

router.get(`/auth`, (req: any, res: Response, next) => {
  console.log(' =====>  inside=========> ')
  if (!req.session.authenticated) {
    res.redirect(`/auth/login`);
  } else {
    res.redirect(`/`);
  }
});

router.get(`/${routePath}/login`, (req: any, res: Response) => {
  if (req.session.authenticated) {
    res.redirect(`/${routePath}`);
  } else {
    res.render('auth', {
      title: 'Auth Page',
      heading: 'Welcome to the Authentication Page',
      message: 'Please log in.',
      PORT,
      auth0ClientID: process.env.AUTH0_CLIENT_ID,
      auth0IssuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      baseURL: req.hostname.includes('localhost')
          ? `http://localhost:${PORT}/${routePath}`
        : `https://${req.hostname}/${routePath}`,
      callbackURL: req.hostname.includes('localhost')
        ? `http://localhost:${PORT}/auth/oauth2/callback?requestPath=${routePath}`
        : `https://${req.hostname}/auth/oauth2/callback?requestPath=${routePath}`,
      authorizationParams: {
        response_type: 'code',
        scope: 'openid profile email',
      },
    });
  }
});

router.get(`/${routePath}/logout`, (req: any, res: Response) => {
  req.session.authenticated = false;
  res.redirect(`/${routePath}`);
});

router.get('/auth/oauth2/callback', (async (req: any, res: Response) => {
  const routePath = req.query.requestPath;
  try {
    const redirectUri = req.hostname.includes('localhost')
      ? `http://localhost:${PORT}/${routePath}`
      : `https://${req.hostname}/${routePath}`;
    const token = await getAuth0Token(req.query.code, redirectUri);
    const userInfo = await getAuth0UserInfo(token);
    req.session.authenticated = true;
    req.session.nickname = userInfo.nickname;
    req.session.email = userInfo.email;
    req.session.auth0User = userInfo.name;
    res.redirect(`/${routePath}`);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.redirect(`/${routePath}/login`);
  }
}) as unknown as Parameters<typeof router.get>[1]);

export default router;
