module.exports = {
    apps: [
        {
            name: 'STARTAI_TWO',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_TWO',
                PORT: 3022
            }
        }
    ]
}
