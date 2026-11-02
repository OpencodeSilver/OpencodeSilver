## App
### Improvements
- Enhanced monorepo quality gates and CI automation.
- The install script shows an "OPEN SILVER" block wordmark, with a plain-text fallback on non-UTF-8 terminals.
- Cross-platform fixes: Windows-safe package scripts (no POSIX-only env syntax), retrying recursive deletes for locked files on Windows, line-ending normalization via `.gitattributes`, and a bilingual startup-failure dialog that points to the real per-OS log file.
- Desktop update checks no longer log errors when the machine is offline.
- Added missing French/Dutch strings and fixed garbled German characters in the free-tier message; Arabic is now accepted as a walkthrough language.

## VS Code
### Improvements
- Added automated pre-package secret scanning and quality checks.
