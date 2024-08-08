import * as Sentry from '@sentry/nextjs';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: 'https://31104059ebc64f998bb81cfb2b1c8814@o4505128356544512.ingest.sentry.io/4505128358510592',

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
  enabled: !IS_DEVELOPMENT

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
