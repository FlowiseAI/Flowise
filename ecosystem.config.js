module.exports = {
    apps: [
        {
            name: 'STARTAI_DEFAULT',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_DEFAULT',
                PORT: 3050
            }
        },
        {
            name: 'STARTAI_ONE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_ONE',
                PORT: 3051
            }
        },
        {
            name: 'STARTAI_TWO',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_TWO',
                PORT: 3052
            }
        },
        {
            name: 'STARTAI_THREE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_THREE',
                PORT: 3053
            }
        },
        {
            name: 'STARTAI_FOUR',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_FOUR',
                PORT: 3054
            }
        },
        {
            name: 'STARTAI_FIVE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: true,
            env: {
                NODE_ENV: 'STARTAI_FIVE',
                PORT: 3055
            }
        }
    ]
}
