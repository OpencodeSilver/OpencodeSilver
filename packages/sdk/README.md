<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="@opencodesilver/sdk" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Extensions SDK</h1>

<p align="center">
  <strong>TypeScript SDK and runtime bridge for building custom OpencodeSilver extensions and agent toolkits.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/sdk`** defines the official contract, manifest schema, and communication bridge between OpencodeSilver and custom extensions. Extensions can render interactive panels on the workspace rail, mount background actions, intercept slash commands, inject custom tool renderers, and interact securely with sessions and projects.

Extensions run in sandboxed environments across both **OpencodeSilver Web** and **Desktop**.

---

## Installation

```bash
# Using npm
npm install @opencodesilver/sdk

# Using bun
bun add @opencodesilver/sdk
```

---

## Extension Structure

An OpencodeSilver extension contains three core components:

```text
my-extension/
├── package.json        # Extension manifest defining capabilities & metadata
├── panel/
│   ├── index.html      # UI page rendered inside the sandboxed iframe
│   └── main.js         # Compiled IIFE bundle (built via esbuild or Bun)
```

### Manifest Schema (`package.json`)

```json
{
  "name": "@my-org/custom-tools",
  "version": "1.0.0",
  "opencodesilver": {
    "apiVersion": 1,
    "engines": { "opencodesilver": ">=1.24.0" },
    "contributes": {
      "panel": {
        "id": "my-tools",
        "name": "Custom Tools",
        "icon": "window",
        "entry": "panel/index.html"
      },
      "capabilities": ["prompt", "sessions", "files"],
      "actions": [
        { "id": "analyze-code", "label": "Analyze with Custom Agent", "where": "message" }
      ],
      "commands": [
        { "name": "benchmark", "description": "Run performance benchmarks" }
      ]
    }
  }
}
```

---

## Host Bridge API

Initialize the client inside your panel or background script:

```typescript
import { connectHost } from '@opencodesilver/sdk';

const host = connectHost();

// Read active workspace and session context
const project = await host.getProject();
const session = await host.getSession();

// Dispatch notifications
await host.toast({
  kind: 'success',
  message: `Project ${project.name} loaded successfully.`,
  dismiss: true
});

// Append text into user prompt composer
await host.appendPrompt('Explain the changes made in the latest commit.');

// Listen for action triggers
host.onAction(async (item) => {
  if (item.action === 'analyze-code') {
    // Perform custom analysis
  }
});
```

---

## Bundling Extensions

Extensions run inside a sandboxed browser iframe and require a single IIFE bundle. Use the included bundler utility or esbuild:

```bash
# Using the bundled CLI
bunx opencodesilver-guest-bundle panel/main.ts panel/main.js

# Or using esbuild directly
esbuild panel/main.ts --bundle --format=iife --platform=browser --outfile=panel/main.js
```

Install your extension in OpencodeSilver by navigating to **Settings → Extensions → Add Folder** and selecting your directory.

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
