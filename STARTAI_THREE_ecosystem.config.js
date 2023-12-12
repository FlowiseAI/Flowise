module.exports = {
    apps: [
        {
            name: 'STARTAI_THREE',
            script: './node_modules/npm/bin/npm-cli.js',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_THREE',
                PORT: 3023
            }
        }
    ]
}
