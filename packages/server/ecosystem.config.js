module.exports = {
    apps: [
        {
            name: 'flowise',
            script: '../../node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT || 3023
            }
        },
        {
            name: process.env.PM2_NAME_FIRST,
            script: '../../node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT_FIRST || 3020
            }
        },
        {
            name: process.env.PM2_NAME_SECOND,
            script: '../../node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT_SECOND || 3021
            }
        },
        {
            name: process.env.PM2_NAME_THIRD,
            script: '../../node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT_THIRD || 3022
            }
        }
    ]
}
