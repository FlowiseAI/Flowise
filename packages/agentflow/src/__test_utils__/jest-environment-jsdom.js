/**
 * Custom Jest environment for jsdom tests
 *
 * Prevents canvas native module from being loaded during test initialization.
 * The canvas package requires native compilation which often fails in CI/CD
 * environments. Since canvas is only optionally used by jsdom and not needed
 * for our React component tests, we mock it at the module require level.
 *
 * Note: This file must be CommonJS (require) because Jest environments
 * do not support ESM.
 */

const JSDOMEnvironment = require('jest-environment-jsdom').default

// Mock canvas before jsdom tries to load it.
// NOTE: This overrides Module.prototype.require globally for the entire test process.
// Any module requiring 'canvas' (not just jsdom) will receive this mock.
// This is acceptable because canvas is only an optional jsdom dependency and
// is not used by any application code under test.
const Module = require('module')

const originalRequire = Module.prototype.require

Module.prototype.require = function (id) {
    if (id === 'canvas') {
        return {
            createCanvas: () => ({
                getContext: () => ({}),
                toBuffer: () => Buffer.from(''),
                toDataURL: () => ''
            }),
            createImageData: () => ({ data: [] }),
            loadImage: () => Promise.resolve({})
        }
    }
    return originalRequire.apply(this, arguments)
}

module.exports = JSDOMEnvironment
