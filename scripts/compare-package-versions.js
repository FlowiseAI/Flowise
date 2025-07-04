#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// Recursively find all package.json files, excluding node_modules and hidden folders
function findPackageJsons(dir, found = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            findPackageJsons(fullPath, found)
        } else if (entry.isFile() && entry.name === 'package.json') {
            found.push(fullPath)
        }
    }
    return found
}

// Collect all dependencies from a package.json
function collectDeps(pkgJson, type) {
    return pkgJson[type] ? Object.entries(pkgJson[type]) : []
}

// Main logic
function main() {
    const root = process.cwd()
    const packageJsonPaths = findPackageJsons(root)
    const depMap = {} // { depName: { version: Set([pkgPath, ...]) } }

    for (const pkgPath of packageJsonPaths) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        const pkgName = pkg.name || pkgPath.replace(root, '')
        for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
            for (const [dep, version] of collectDeps(pkg, depType)) {
                if (!depMap[dep]) depMap[dep] = {}
                if (!depMap[dep][version]) depMap[dep][version] = new Set()
                depMap[dep][version].add(pkgName)
            }
        }
    }

    // Find mismatches
    const mismatches = Object.entries(depMap).filter(([dep, versions]) => Object.keys(versions).length > 1)
    if (mismatches.length === 0) {
        console.log('All dependencies are consistent across packages!')
        return
    }
    console.log('Dependency version mismatches found:')
    for (const [dep, versions] of mismatches) {
        console.log(`\n${dep}:`)
        for (const [version, pkgs] of Object.entries(versions)) {
            console.log(`  ${version}:`)
            for (const pkg of pkgs) {
                console.log(`    - ${pkg}`)
            }
        }
    }
}

main()
