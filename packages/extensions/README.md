<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="OpencodeSilver Extensions" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Built-in Extensions</h1>

<p align="center">
  <strong>Native built-in extension manifests, tools catalog, and runtime registry.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/extensions`** houses the first-party, built-in extensions and core tools shipped with OpencodeSilver. These extensions utilize the public `@opencodesilver/sdk` contract and are bundled directly into the distribution artifacts during build time.

---

## Architecture & Build Pipeline

- **Zero Runtime Dependencies:** This directory acts as an asset registry rather than an npm workspace, compiling directly against the root SDK.
- **Single-File Bundles:** Browser entries are compiled into standalone IIFE bundles to run securely inside sandboxed iframes without runtime module resolution.
- **Registry Validation:** `registry.json` defines the allowlist of built-in extensions, specifying output entrypoints, permissions, and icons.
- **Output Target:** Built artifacts are generated into `packages/web/server/built-in-extensions/` and bundled with production web and desktop releases.

---

## Build Command

From the repository root:

```bash
bun run extensions:build
```

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
