/**
 * Stub for ESM-only packages that cannot be require()'d in Jest's CJS environment.
 *
 * Returns a real ES6 class for every named export so that patterns like
 *   class MCPToolkit extends BaseToolkit { ... }
 * don't crash at module-load time, even though the class is never instantiated
 * in these tests.
 */
class Stub {}

module.exports = new Proxy(
    {},
    {
        get: (_target, prop) => {
            if (prop === '__esModule') return false
            return Stub
        }
    }
)
