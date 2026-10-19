<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="OpencodeSilver Mobile" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Mobile</h1>

<p align="center">
  <strong>Native iOS and Android mobile runtime powered by Capacitor.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/mobile`** packages OpencodeSilver into a dedicated native mobile shell for **iOS** and **Android** using Capacitor. It connects directly to your active OpencodeSilver workstations or cloud instances, enabling on-the-go agent supervision, session inspection, remote terminal access, and task notifications from your phone or tablet.

---

## Runtime Architecture

- **Dedicated Mobile Interface:** Bundles the mobile-optimized UI directly on the device, ensuring snappy navigation without full page reloads.
- **Instance Management:** Connect and switch effortlessly between multiple local or remote OpencodeSilver servers with secure token storage.
- **Responsive Tablet & Foldable Layout:** Live responsive layout (`useTabletLayout`) that expands into a persistent sidebar on iPad, Android tablets, and foldable devices when unfolded.
- **Remote Terminal PTY:** Interact with live development terminals running on your remote workstation over secure WebSockets with touch scroll and text selection.
- **Native OS Sharing:** Integrated system share sheets for downloading images, files, and diff patches across iOS and Android.

---

## Build and Run Scripts

Run these commands from `packages/mobile`, or use the root `mobile:*` shortcuts:

```bash
# Build web assets and prepare mobile distribution
bun run build

# Synchronize Capacitor native projects
bun run sync

# Build Android debug APK
bun run build:android:debug

# Build iOS Simulator app
bun run build:ios:simulator

# Launch iOS Simulator development loop
bun run sim:dev

# Open native IDE projects
bun run open:ios        # Opens Xcode
bun run open:android    # Opens Android Studio
```

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
