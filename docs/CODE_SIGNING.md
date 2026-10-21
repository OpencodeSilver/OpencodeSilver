# OpencodeSilver Code Signing & Release Verification Guide

This document defines the security procedures, environment variables, secrets, and verification steps for signing and publishing official releases of **OpencodeSilver**.

---

## 1. Artifact Verification (SHA-256 Checksums)

Every official release includes a verifiable checksum manifest: `SHA256SUMS.txt`.

### Verifying on Linux / macOS:
```bash
sha256sum -c SHA256SUMS.txt
```

### Verifying on Windows (PowerShell):
```powershell
Get-FileHash -Algorithm SHA256 OpencodeSilver-*.exe
```

---

## 2. Windows Authenticode Signing

To prevent SmartScreen warnings and certify software authenticity on Windows:

### Required Secrets in GitHub Actions:
- `WIN_CSC_LINK`: Base64-encoded PKCS#12 certificate (`.pfx` file).
- `WIN_CSC_KEY_PASSWORD`: Password for the certificate.

### Electron Builder Automatic Signing:
When `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` are defined in the environment, `electron-builder` automatically signs:
1. All generated `.exe` binaries (NSIS installer and packaged app binary).
2. The uninstaller binary.

---

## 3. macOS Developer ID Signing & Notarization

To pass Gatekeeper and run without warnings on macOS (Apple Silicon & Intel):

### Required Secrets in GitHub Actions:
- `CSC_LINK`: Base64-encoded Apple Developer ID Application certificate (`.p12`).
- `CSC_KEY_PASSWORD`: Certificate password.
- `APPLE_ID`: Apple Developer account email.
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password generated on appleid.apple.com.
- `APPLE_TEAM_ID`: 10-character Apple Developer Team ID.

`electron-builder` submits `.dmg` and `.zip` archives to Apple's notarization notary service and staples the ticket upon successful clearance.

---

## 4. Android APK Signing

Production Android APK releases are signed using an Android release keystore:

### Required Secrets in GitHub Actions:
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded Java KeyStore (`.keystore` or `.jks`).
- `ANDROID_KEYSTORE_PASSWORD`: Keystore store password.
- `ANDROID_KEY_ALIAS`: Key alias.
- `ANDROID_KEY_PASSWORD`: Key password.

### Manual Sign & Align (Android SDK):
```bash
zipalign -v -p 4 app-release-unsigned.apk OpencodeSilver-aligned.apk
apksigner sign --ks release.keystore --ks-key-alias my-key-alias OpencodeSilver-aligned.apk
apksigner verify OpencodeSilver-aligned.apk
```

---

## 5. Software Bill of Materials (SBOM)

Every release generates a CycloneDX standard SBOM (`opencode-silver-sbom.cdx.json`) documenting:
- All top-level and transitive npm dependencies.
- Cryptographic package hashes and licenses.
- Supply chain provenance.
