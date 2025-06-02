#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

// Paths
const rootDir = path.resolve(__dirname, '..', '..', '..')
const inputPath = path.join(rootDir, 'repomix-output.xml')
const outputPath = path.join(rootDir, 'repomix-output.cleaned.xml')

// Read, filter, and write
const input = fs.readFileSync(inputPath, 'utf8')
const lines = input.split(/\r?\n/)
const cleaned = lines.filter((line) => !/^\s*api: /.test(line))
fs.writeFileSync(outputPath, cleaned.join('\n'), 'utf8')

console.log(`Cleaned file written to ${outputPath}`)
