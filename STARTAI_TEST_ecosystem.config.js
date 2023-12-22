module.exports = {
    apps: [
        {
            name: 'STARTAI_TEST',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_TEST',
                PORT: 3026
            }
        }
    ]
}
