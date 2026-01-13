# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.13] - 2026-01-13

### Added
- **JIRA Tool: Bearer Token Authentication** - Support for enterprise/self-hosted JIRA instances requiring Bearer token authentication.
- **JIRA Tool: SSL Certificate Support** - New `sslCertPath` and `sslKeyPath` options for secure connections to JIRA servers with custom certificates.
- **JIRA Tool: SSL Verification Toggle** - `verifySslCerts` option to disable certificate verification for development environments.
- **JIRA Tool: Comprehensive Test Suite** - Unit tests, integration tests, and regression tests for Bearer Token + SSL features.
- **JIRA Tool: Documentation** - Added README.md with authentication guides, SSL configuration, and troubleshooting.

### Changed
- **JiraApi Credential** - Updated to version 2.0 with authentication type selector (Basic Auth / Bearer Token).
- **JIRA Tool Core** - Refactored `BaseJiraTool` class with `buildHeaders()` and `buildFetchOptions()` methods for cleaner authentication handling.

### Fixed
- Improved error messages for SSL certificate loading failures.

### Notes
- **Backward Compatibility**: Basic Auth (`email + apiToken`) continues to work exactly as before. Existing users do not need to change anything.
- **Migration**: Users can switch to Bearer Token by selecting "Bearer Token" in the credential configuration and providing their token.

---

## [3.0.12] - Previous Release

_See [GitHub Releases](https://github.com/FlowiseAI/Flowise/releases) for previous version history._
