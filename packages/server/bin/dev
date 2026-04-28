#!/usr/bin/env node

const oclif = require('@oclif/core')

const path = require('path')
const project = path.join(__dirname, '..', 'tsconfig.json')

// In dev mode -> use ts-node and dev plugins
process.env.NODE_ENV = 'development'

require('ts-node').register({ project })

// In dev mode, always show stack traces
oclif.settings.debug = true

// Start the CLI
oclif.run().then(oclif.flush).catch(oclif.Errors.handle)
