# Experimental Prisma Webpack Plugin

Ensures that your Prisma files are copied

## Next.js

```js
const { PrismaPlugin } = require('experimental-prisma-webpack-plugin')

module.exports = {
    output: 'standalone',
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.plugins = [...config.plugins, new PrismaPlugin()]
        }

        return config
    }
}
```

## Webpack

```js
const { PrismaPlugin } = require('experimental-prisma-webpack-plugin')

module.exports = {
    plugins: [new PrismaPlugin()]
}
```

## Known issues

### Multiple clients

If you are using multiple clients, they must be of the same version.

This is because the plugin assumes the engines will have same versions.
