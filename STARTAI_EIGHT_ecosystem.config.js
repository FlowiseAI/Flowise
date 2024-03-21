module.exports = {
    apps: [
        {
            name: 'STARTAI_EIGHT',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_EIGHT',
                PORT: 3029
            }
        }
    ]
}
