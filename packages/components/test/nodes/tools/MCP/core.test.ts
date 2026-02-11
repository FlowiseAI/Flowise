import {
    validateCommandFlags,
    validateCommandInjection,
    validateArgsForLocalFileAccess,
    validateEnvironmentVariables,
    validateMCPServerConfig
} from '../../../../nodes/tools/MCP/core'

describe('MCP Security Validations', () => {
    describe('validateCommandFlags', () => {
        describe('npx command', () => {
            it('should block -c flag', () => {
                expect(() => {
                    validateCommandFlags('npx', ['-c', 'malicious command'])
                }).toThrow("Argument '-c' is not allowed for command 'npx'")
            })

            it('should block --call flag', () => {
                expect(() => {
                    validateCommandFlags('npx', ['--call', 'rm -rf /'])
                }).toThrow("Argument '--call' is not allowed for command 'npx'")
            })

            it('should block --shell-auto-fallback flag', () => {
                expect(() => {
                    validateCommandFlags('npx', ['--shell-auto-fallback'])
                }).toThrow("Argument '--shell-auto-fallback' is not allowed for command 'npx'")
            })

            it('should block case variations', () => {
                expect(() => {
                    validateCommandFlags('npx', ['-C', 'command'])
                }).toThrow("Argument '-C' is not allowed for command 'npx'")

                expect(() => {
                    validateCommandFlags('npx', ['--CALL', 'command'])
                }).toThrow("Argument '--CALL' is not allowed for command 'npx'")
            })

            it('should allow legitimate npx usage', () => {
                expect(() => {
                    validateCommandFlags('npx', ['@modelcontextprotocol/server-filesystem', '/tmp'])
                }).not.toThrow()

                expect(() => {
                    validateCommandFlags('npx', ['-y', '@modelcontextprotocol/server-github'])
                }).not.toThrow()
            })
        })

        describe('node command', () => {
            it('should block -e flag', () => {
                expect(() => {
                    validateCommandFlags('node', ['-e', "require('child_process').exec('malicious')"])
                }).toThrow("Argument '-e' is not allowed for command 'node'")
            })

            it('should block --eval flag', () => {
                expect(() => {
                    validateCommandFlags('node', ['--eval', 'malicious code'])
                }).toThrow("Argument '--eval' is not allowed for command 'node'")
            })

            it('should block -p/--print flags', () => {
                expect(() => {
                    validateCommandFlags('node', ['-p', 'process.version'])
                }).toThrow("Argument '-p' is not allowed for command 'node'")

                expect(() => {
                    validateCommandFlags('node', ['--print', 'code'])
                }).toThrow("Argument '--print' is not allowed for command 'node'")
            })

            it('should block --inspect flags', () => {
                expect(() => {
                    validateCommandFlags('node', ['--inspect'])
                }).toThrow("Argument '--inspect' is not allowed for command 'node'")

                expect(() => {
                    validateCommandFlags('node', ['--inspect-brk'])
                }).toThrow("Argument '--inspect-brk' is not allowed for command 'node'")
            })

            it('should allow legitimate node usage', () => {
                expect(() => {
                    validateCommandFlags('node', ['server.js'])
                }).not.toThrow()

                expect(() => {
                    validateCommandFlags('node', ['--experimental-modules', 'app.mjs'])
                }).not.toThrow()
            })
        })

        describe('python/python3 commands', () => {
            it('should block -c flag for python', () => {
                expect(() => {
                    validateCommandFlags('python', ['-c', 'import os; os.system("malicious")'])
                }).toThrow("Argument '-c' is not allowed for command 'python'")
            })

            it('should block -c flag for python3', () => {
                expect(() => {
                    validateCommandFlags('python3', ['-c', 'malicious code'])
                }).toThrow("Argument '-c' is not allowed for command 'python3'")
            })

            it('should block -m flag', () => {
                expect(() => {
                    validateCommandFlags('python', ['-m', 'http.server'])
                }).toThrow("Argument '-m' is not allowed for command 'python'")

                expect(() => {
                    validateCommandFlags('python3', ['-m', 'malicious_module'])
                }).toThrow("Argument '-m' is not allowed for command 'python3'")
            })

            it('should allow legitimate python usage', () => {
                expect(() => {
                    validateCommandFlags('python', ['script.py'])
                }).not.toThrow()

                expect(() => {
                    validateCommandFlags('python3', ['-u', 'unbuffered_script.py'])
                }).not.toThrow()
            })
        })

        describe('docker command', () => {
            it('should block run subcommand', () => {
                expect(() => {
                    validateCommandFlags('docker', ['run', 'alpine', 'sh'])
                }).toThrow("Argument 'run' is not allowed for command 'docker'")
            })

            it('should block exec subcommand', () => {
                expect(() => {
                    validateCommandFlags('docker', ['exec', 'container', 'malicious'])
                }).toThrow("Argument 'exec' is not allowed for command 'docker'")
            })

            it('should block volume mounts', () => {
                expect(() => {
                    validateCommandFlags('docker', ['-v', '/:/host'])
                }).toThrow("Argument '-v' is not allowed for command 'docker'")

                expect(() => {
                    validateCommandFlags('docker', ['--volume', '/:/host'])
                }).toThrow("Argument '--volume' is not allowed for command 'docker'")

                expect(() => {
                    validateCommandFlags('docker', ['--volume=/:/host'])
                }).toThrow("Argument '--volume=/:/host' contains flag '--volume' that is not allowed for command 'docker'.")
            })

            it('should block privileged mode', () => {
                expect(() => {
                    validateCommandFlags('docker', ['--privileged'])
                }).toThrow("Argument '--privileged' is not allowed for command 'docker'")
            })

            it('should block host network/pid/ipc access', () => {
                // --flag=value syntax
                expect(() => {
                    validateCommandFlags('docker', ['--network=host'])
                }).toThrow("contains flag '--network'")

                expect(() => {
                    validateCommandFlags('docker', ['--pid=host'])
                }).toThrow("contains flag '--pid'")

                expect(() => {
                    validateCommandFlags('docker', ['--ipc=host'])
                }).toThrow("contains flag '--ipc'")

                // --flag value as separate args
                expect(() => {
                    validateCommandFlags('docker', ['--network', 'host'])
                }).toThrow("Argument '--network' is not allowed for command 'docker'")

                expect(() => {
                    validateCommandFlags('docker', ['--pid', 'host'])
                }).toThrow("Argument '--pid' is not allowed for command 'docker'")

                expect(() => {
                    validateCommandFlags('docker', ['--ipc', 'host'])
                }).toThrow("Argument '--ipc' is not allowed for command 'docker'")
            })

            it('should allow safe docker usage', () => {
                expect(() => {
                    validateCommandFlags('docker', ['ps'])
                }).not.toThrow()

                expect(() => {
                    validateCommandFlags('docker', ['images'])
                }).not.toThrow()
            })
        })

        describe('edge cases', () => {
            it('should handle non-string arguments gracefully', () => {
                expect(() => {
                    // @ts-ignore - testing non-string args
                    validateCommandFlags('npx', [123, null, undefined])
                }).not.toThrow()
            })

            it('should handle unknown commands gracefully', () => {
                expect(() => {
                    validateCommandFlags('unknown-command', ['-c', 'anything'])
                }).not.toThrow()
            })

            it('should handle empty args array', () => {
                expect(() => {
                    validateCommandFlags('npx', [])
                }).not.toThrow()
            })

            it('should handle args with whitespace', () => {
                expect(() => {
                    validateCommandFlags('npx', ['  -c  '])
                }).toThrow("Argument '  -c  ' is not allowed for command 'npx'")
            })
        })
    })

    describe('validateCommandInjection', () => {
        it('should block shell metacharacters', () => {
            expect(() => {
                validateCommandInjection(['arg1', 'arg2; rm -rf /'])
            }).toThrow('Argument contains potentially dangerous characters')

            expect(() => {
                validateCommandInjection(['arg1 && malicious'])
            }).toThrow('Argument contains potentially dangerous characters')

            expect(() => {
                validateCommandInjection(['arg1 | malicious'])
            }).toThrow('Argument contains potentially dangerous characters')
        })

        it('should block command substitution', () => {
            expect(() => {
                validateCommandInjection(['$(malicious)'])
            }).toThrow('Argument contains potentially dangerous characters')

            expect(() => {
                validateCommandInjection(['`malicious`'])
            }).toThrow('Argument contains potentially dangerous characters')
        })

        it('should allow safe arguments', () => {
            expect(() => {
                validateCommandInjection(['--option', 'value', 'arg1', 'arg2'])
            }).not.toThrow()
        })
    })

    describe('validateArgsForLocalFileAccess', () => {
        it('should block absolute paths', () => {
            expect(() => {
                validateArgsForLocalFileAccess(['/etc/passwd'])
            }).toThrow('Argument contains potential local file access')

            expect(() => {
                validateArgsForLocalFileAccess(['C:\\Windows\\System32'])
            }).toThrow('Argument contains potential local file access')
        })

        it('should block path traversal', () => {
            expect(() => {
                validateArgsForLocalFileAccess(['../../../etc/passwd'])
            }).toThrow('Argument contains potential local file access')

            expect(() => {
                validateArgsForLocalFileAccess(['..\\..\\Windows'])
            }).toThrow('Argument contains potential local file access')
        })

        it('should block dangerous file extensions', () => {
            expect(() => {
                validateArgsForLocalFileAccess(['malware.exe'])
            }).toThrow('Argument contains potential local file access')

            expect(() => {
                validateArgsForLocalFileAccess(['script.sh'])
            }).toThrow('Argument contains potential local file access')
        })

        it('should block null bytes', () => {
            expect(() => {
                validateArgsForLocalFileAccess(['file\0.txt'])
            }).toThrow('Argument contains null byte')
        })

        it('should allow safe arguments', () => {
            expect(() => {
                validateArgsForLocalFileAccess(['@modelcontextprotocol/server-github', 'safe-arg'])
            }).not.toThrow()
        })
    })

    describe('validateEnvironmentVariables', () => {
        it('should block dangerous environment variables', () => {
            expect(() => {
                validateEnvironmentVariables({ PATH: '/malicious/path' })
            }).toThrow("Environment variable 'PATH' modification is not allowed")

            expect(() => {
                validateEnvironmentVariables({ NODE_OPTIONS: '--inspect' })
            }).toThrow("Environment variable 'NODE_OPTIONS' modification is not allowed")
        })

        it('should block null bytes in values', () => {
            expect(() => {
                validateEnvironmentVariables({ CUSTOM_VAR: 'value\0malicious' })
            }).toThrow("Environment variable 'CUSTOM_VAR' contains null byte")
        })

        it('should allow safe environment variables', () => {
            expect(() => {
                validateEnvironmentVariables({ CUSTOM_VAR: 'safe-value', API_KEY: 'key123' })
            }).not.toThrow()
        })
    })

    describe('validateMCPServerConfig', () => {
        it('should validate complete server configuration', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['@modelcontextprotocol/server-filesystem', 'workspace']
                })
            }).not.toThrow()
        })

        it('should block invalid commands', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'curl',
                    args: ['https://malicious.com']
                })
            }).toThrow("Command 'curl' is not allowed")
        })

        it('should block dangerous command flags', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['-c', 'malicious command']
                })
            }).toThrow("Argument '-c' is not allowed for command 'npx'")
        })

        it('should block command injection in args', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['arg1; malicious']
                })
            }).toThrow('Argument contains potentially dangerous characters')
        })

        it('should block path traversal in args', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['../../../etc/passwd']
                })
            }).toThrow('Argument contains potential local file access')
        })

        it('should block dangerous environment variables', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['safe-arg'],
                    env: { PATH: '/malicious' }
                })
            }).toThrow("Environment variable 'PATH' modification is not allowed")
        })

        it('should reject invalid server params', () => {
            expect(() => {
                validateMCPServerConfig(null)
            }).toThrow('Invalid server configuration')

            expect(() => {
                validateMCPServerConfig('string')
            }).toThrow('Invalid server configuration')
        })

        it('should allow legitimate MCP server configurations', () => {
            expect(() => {
                validateMCPServerConfig({
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-github'],
                    env: { GITHUB_TOKEN: 'token123' }
                })
            }).not.toThrow()

            expect(() => {
                validateMCPServerConfig({
                    command: 'node',
                    args: ['mcp-server.js']
                })
            }).not.toThrow()
        })
    })
})
