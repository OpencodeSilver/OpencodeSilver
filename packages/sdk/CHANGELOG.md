# Changelog

All notable changes to the OpencodeSilver Extensions SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-10-18

### Added
- **Extensions Contract & Manifest:** Standardized `package.json` manifest schema supporting panels, background actions, and custom tool rendering.
- **Host Bridge API (`connectHost`):** Safe iframe bridge for querying active sessions, projects, appending prompts, and dispatching toast notifications.
- **Background Actions Engine:** Sandboxed background handlers for message and session operations without opening persistent UI.
- **Bundler Integration:** Standalone bundling toolchain generating clean IIFE scripts for sandboxed extension runtimes.
- **Fine-Grained Permissions:** User-approved capability system governing file access, model prompts, and network integrations.
