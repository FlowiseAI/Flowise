module.exports = {
    apps: [
        {
            name: 'STARTAI_EIGHT',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_EIGHT',
                PORT: 3029
            }
        }
    ]
}
