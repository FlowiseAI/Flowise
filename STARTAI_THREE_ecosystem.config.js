module.exports = {
    apps: [
        {
            name: 'STARTAI_THREE',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_THREE',
                PORT: 3023
            }
        }
    ]
}
