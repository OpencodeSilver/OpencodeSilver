<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="OpencodeSilver Web" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Web & PWA</h1>

<p align="center">
  <strong>Browser-based development workspace, REST/WebSocket server, and mobile-ready PWA.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/web`** powers the web runtime and server architecture for OpencodeSilver. It packages the HTTP backend, real-time WebSocket communication, terminal PTY managers, background task handlers, and the responsive Progressive Web App (PWA).

Whether hosted locally on your workstation, run headlessly in a cloud container, or served over secure private tunnels, `@opencodesilver/web` brings the full power of autonomous coding agents to any modern web browser on desktop, tablet, or phone.

---

## Key Features

- **Anywhere Browser Access:** Full OpenCode functionality directly inside Chrome, Safari, Firefox, or Edge without installing desktop frameworks.
- **Mobile-First PWA:** Installable home-screen application with touch gestures, adaptive viewport management, and keyboard-safe mobile layouts.
- **Encrypted Remote Tunnels:** Cloudflare Tunnel integration (Quick, Managed-Remote, and Managed-Local) with instant QR code pairing.
- **Cross-Tab Synchronization:** Active chat streams, diffs, and execution terminals stay in real-time sync across multiple browser tabs.
- **Background Task Notifications:** Web Push and system notifications alert you when long-running agent workflows or model runs finish.
- **Integrated Terminal PTY:** Full terminal multiplexing over secure WebSockets with shell environment persistence.

---

## Installation

### Automatic Install Script
```bash
curl -fsSL https://raw.githubusercontent.com/OpencodeSilver/OpencodeSilver/main/scripts/install.sh | bash
```

### Via Package Manager
```bash
# Using Bun (Recommended)
bun add -g @opencodesilver/web

# Or using npm / pnpm / yarn
npm install -g @opencodesilver/web
```

> **Prerequisites:** [OpenCode CLI](https://opencode.ai) installed, Node.js 22+ or Bun 1.4+.

---

## CLI Usage

```bash
# Start web server on default port 3000
opencodesilver

# Custom port and network binding
opencodesilver --port 8080
opencodesilver --lan --port 3000

# Password-protect web interface
opencodesilver --ui-password your-secure-password

# Generate QR code pairing link for Desktop or Mobile
opencodesilver connect-url --port 3000 --qr

# Start Cloudflare tunnel with instant QR code
opencodesilver tunnel start --provider cloudflare --mode quick --qr

# Enable native system startup service
opencodesilver startup enable
opencodesilver startup status
opencodesilver startup disable

# Stop background instance
opencodesilver stop
```

---

## Connecting from Desktop or Mobile

Use `connect-url` to pair your remote server with OpencodeSilver Desktop or Mobile:

```bash
opencodesilver connect-url --port 3000 --qr
```

For headless servers (without browser UI assets):
```bash
opencodesilver connect-url --port 3000 --api-only --lan --server http://workstation.local:3000 --qr --ui-password your-password
```

This generates an encrypted `opencodesilver://connect?...` token containing the server configuration, port, and security credentials.

---

## Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `OPENCODESILVER_PORT` | `3000` | Port for the web interface and API |
| `OPENCODESILVER_HOST` | `127.0.0.1` | Host interface to bind (`0.0.0.0` for LAN) |
| `OPENCODESILVER_UI_PASSWORD` | _None_ | Mandatory authentication password |
| `OPENCODE_HOST` | _Internal_ | URL of an external OpenCode server |
| `OPENCODE_PORT` | `4096` | Port of an external OpenCode server |
| `OPENCODE_SKIP_START` | `false` | Skip spawning internal OpenCode process |
| `OPENCODESILVER_FS_UPLOAD_MAX_BYTES` | `104857600` | Maximum file upload size in bytes (100 MiB) |

---

## Running as a System Service (systemd)

For persistent cloud workstations, set up user systemd services:

**`~/.config/systemd/user/opencodesilver.service`**
```ini
[Unit]
Description=OpencodeSilver Web Server
After=network.target

[Service]
Type=simple
ExecStart=opencodesilver serve --port 3000 --host 0.0.0.0 --ui-password your-password --foreground
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Enable and start the service:
```bash
systemctl --user daemon-reload
systemctl --user enable --now opencodesilver
```

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
