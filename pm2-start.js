// PM2 entry point for DK-Platform
// This file allows PM2 to properly start the Flowise server

const oclif = require('@oclif/core')

// Run the start command
oclif.run(['start']).then(require('@oclif/core/flush')).catch(require('@oclif/core/handle'))
