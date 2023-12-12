module.exports = {
    apps: [
        {
            name: 'STARTAI_FOUR',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_FOUR',
                PORT: 3024
            }
        }
    ]
}
