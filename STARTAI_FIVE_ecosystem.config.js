module.exports = {
    apps: [
        {
            name: 'STARTAI_FIVE',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_FIVE',
                PORT: 3025
            }
        }
    ]
}
