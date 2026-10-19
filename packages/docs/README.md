<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="OpencodeSilver Docs" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Documentation Source</h1>

<p align="center">
  <strong>Source-of-truth documentation, multi-lingual guides, and API references.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/docs`** manages the documentation source content, API references, configuration guides, and community translations for OpencodeSilver.

---

## Directory Layout

- `content/docs/*.mdx` — Canonical English documentation pages.
- `content/docs/<locale>/*.mdx` — Localized documentation pages mirroring the primary English paths (e.g. `ar/`, `uk/`, `zh-cn/`, `fr/`, `de/`).
- `sidebar.config.json` — Hierarchical navigation structure for the documentation website.
- `CONTRIBUTING.md` — Guide for contributing new sections, tutorials, and language translations.
- `DEPLOYMENT.md` — Packaging pipeline and documentation synchronization workflows.

---

## Validation Commands

Run from the repository root:

```bash
# Validate frontmatter and verify all sidebar routes resolve
bun run docs:validate
```

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
