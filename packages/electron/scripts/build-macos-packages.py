import hashlib
import os
import plistlib
import shutil
import struct
import subprocess
import tarfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"C:\Users\GEMTM\Downloads\Documents\101")
ELECTRON_PKG = ROOT / "packages" / "electron"
DIST_DIR = ELECTRON_PKG / "dist"
CACHE_DIR = Path(os.environ.get("LOCALAPPDATA", r"C:\Users\GEMTM\AppData\Local")) / "electron" / "Cache"
CLI_CACHE = ELECTRON_PKG / ".cache" / "opencode-cli" / "2.0.25"

VERSION = "2.9.0"
ELECTRON_VERSION = "43.7.0"
APP_NAME = "OpencodeSilver"
APP_ID = "com.opencodesilver.desktop"

ASAR_PATH = DIST_DIR / "win-unpacked" / "resources" / "app.asar"
ICON_PATH = ELECTRON_PKG / "build" / "icon.icns"
WEB_DIST_DIR = ELECTRON_PKG / "resources" / "web-dist"


def compute_asar_header_hash(asar_path: Path) -> str:
    with open(asar_path, "rb") as f:
        header_data = f.read(16)
        _, _, _, header_str_len = struct.unpack("<IIII", header_data)
        header_json_bytes = f.read(header_str_len)
    return hashlib.sha256(header_json_bytes).hexdigest()


def ensure_electron_zip(arch: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    zip_name = f"electron-v{ELECTRON_VERSION}-darwin-{arch}.zip"
    zip_path = CACHE_DIR / zip_name
    if not zip_path.exists():
        # Search inside subdirectories of CACHE_DIR first
        found = list(CACHE_DIR.rglob(zip_name))
        if found:
            return found[0]
        url = f"https://github.com/electron/electron/releases/download/v{ELECTRON_VERSION}/{zip_name}"
        print(f"Downloading {url}...")
        urllib.request.urlretrieve(url, zip_path)
    return zip_path


def ensure_opencode_darwin_cli(arch: str) -> Path:
    target_dir = CLI_CACHE / f"darwin-{arch}"
    target_dir.mkdir(parents=True, exist_ok=True)
    bin_path = target_dir / "opencode"
    if bin_path.exists():
        return bin_path
    # Check if archive exists in target_dir
    archives = list(target_dir.glob("*.zip")) + list(target_dir.glob("*.tgz")) + list(target_dir.glob("*.tar.gz"))
    if not archives:
        pkg_arch = "arm64" if arch == "arm64" else "x64"
        url = f"https://registry.npmjs.org/opencode-darwin-{pkg_arch}/-/opencode-darwin-{pkg_arch}-2.0.25.tgz"
        tgz_path = target_dir / f"opencode-darwin-{pkg_arch}-2.0.25.tgz"
        print(f"Downloading {url}...")
        urllib.request.urlretrieve(url, tgz_path)
        archives = [tgz_path]
    archive = archives[0]
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive, "r") as zf:
            for member in zf.namelist():
                if member.endswith("/opencode") or member == "opencode":
                    data = zf.read(member)
                    bin_path.write_bytes(data)
                    break
    else:
        with tarfile.open(archive, "r:*") as tf:
            for member in tf.getmembers():
                if member.name.endswith("/opencode") or member.name == "opencode":
                    f = tf.extractfile(member)
                    if f:
                        bin_path.write_bytes(f.read())
                        break
    return bin_path


def update_plist_bytes(plist_bytes: bytes, is_main: bool, helper_suffix: str, asar_hash: str) -> bytes:
    pl = plistlib.loads(plist_bytes)
    if is_main:
        pl["CFBundleDisplayName"] = APP_NAME
        pl["CFBundleName"] = APP_NAME
        pl["CFBundleExecutable"] = APP_NAME
        pl["CFBundleIdentifier"] = APP_ID
        pl["CFBundleShortVersionString"] = VERSION
        pl["CFBundleVersion"] = VERSION
        pl["CFBundleIconFile"] = "icon.icns"
        pl["LSApplicationCategoryType"] = "public.app-category.developer-tools"
        pl["ElectronAsarIntegrity"] = {
            "Resources/app.asar": {
                "algorithm": "SHA256",
                "hash": asar_hash,
            }
        }
    else:
        name = f"{APP_NAME} Helper{helper_suffix}"
        pl["CFBundleDisplayName"] = name
        pl["CFBundleName"] = name
        pl["CFBundleExecutable"] = name
        id_suffix = helper_suffix.strip().lower().replace("(", "").replace(")", "").replace(" ", ".")
        pl["CFBundleIdentifier"] = f"{APP_ID}.helper.{id_suffix}" if id_suffix else f"{APP_ID}.helper"
        pl["CFBundleShortVersionString"] = VERSION
        pl["CFBundleVersion"] = VERSION
    return plistlib.dumps(pl, fmt=plistlib.FMT_XML)


def rename_app_path(rel_path: str) -> str:
    if not rel_path.startswith("Electron.app/"):
        return rel_path
    p = f"{APP_NAME}.app/" + rel_path[len("Electron.app/"):]
    if p == f"{APP_NAME}.app/Contents/MacOS/Electron":
        return f"{APP_NAME}.app/Contents/MacOS/{APP_NAME}"
    for suffix in [" (GPU)", " (Plugin)", " (Renderer)", ""]:
        old_helper = f"Contents/Frameworks/Electron Helper{suffix}.app"
        new_helper = f"Contents/Frameworks/{APP_NAME} Helper{suffix}.app"
        if old_helper in p:
            p = p.replace(old_helper, new_helper)
            old_exec = f"/Contents/MacOS/Electron Helper{suffix}"
            new_exec = f"/Contents/MacOS/{APP_NAME} Helper{suffix}"
            if p.endswith(old_exec):
                p = p[: -len(old_exec)] + new_exec
            break
    return p


def add_file_to_zip(zf: zipfile.ZipFile, arcname: str, data: bytes, mode: int = 0o100644):
    zi = zipfile.ZipInfo(arcname)
    zi.date_time = (2026, 10, 8, 6, 0, 0)
    zi.create_system = 3  # Unix
    zi.external_attr = (mode & 0xFFFF) << 16
    zi.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(zi, data)


def build_mac_arch(arch: str, asar_hash: str) -> dict:
    print(f"Building macOS {arch} packages...")
    electron_zip = ensure_electron_zip(arch)
    opencode_bin = ensure_opencode_darwin_cli(arch)

    out_zip = DIST_DIR / f"{APP_NAME}-{VERSION}-mac-{arch}.zip"
    out_dmg = DIST_DIR / f"{APP_NAME}-{VERSION}-mac-{arch}.dmg"

    asar_bytes = ASAR_PATH.read_bytes()
    icon_bytes = ICON_PATH.read_bytes()
    opencode_bytes = opencode_bin.read_bytes()

    with zipfile.ZipFile(electron_zip, "r") as src_zf, zipfile.ZipFile(
        out_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6
    ) as dst_zf:
        for info in src_zf.infolist():
            orig_name = info.filename
            if not orig_name.startswith("Electron.app/"):
                continue
            if orig_name == "Electron.app/Contents/Resources/default_app.asar":
                continue
            if orig_name == "Electron.app/Contents/Resources/electron.icns":
                continue

            new_name = rename_app_path(orig_name)
            raw_data = src_zf.read(orig_name)

            if new_name == f"{APP_NAME}.app/Contents/Info.plist":
                raw_data = update_plist_bytes(raw_data, True, "", asar_hash)
            else:
                for suffix in [" (GPU)", " (Plugin)", " (Renderer)", ""]:
                    if new_name == f"{APP_NAME}.app/Contents/Frameworks/{APP_NAME} Helper{suffix}.app/Contents/Info.plist":
                        raw_data = update_plist_bytes(raw_data, False, suffix, asar_hash)
                        break

            new_info = zipfile.ZipInfo(new_name)
            new_info.date_time = info.date_time
            new_info.create_system = info.create_system
            new_info.external_attr = info.external_attr
            new_info.compress_type = info.compress_type
            dst_zf.writestr(new_info, raw_data)

        # Add app.asar, icon.icns, opencode CLI, and web-dist
        add_file_to_zip(dst_zf, f"{APP_NAME}.app/Contents/Resources/app.asar", asar_bytes, 0o100644)
        add_file_to_zip(dst_zf, f"{APP_NAME}.app/Contents/Resources/icon.icns", icon_bytes, 0o100644)
        add_file_to_zip(dst_zf, f"{APP_NAME}.app/Contents/Resources/opencode-cli/opencode", opencode_bytes, 0o100755)

        for root_dir, _, files in os.walk(WEB_DIST_DIR):
            for fname in files:
                fpath = Path(root_dir) / fname
                rel = fpath.relative_to(WEB_DIST_DIR).as_posix()
                add_file_to_zip(
                    dst_zf,
                    f"{APP_NAME}.app/Contents/Resources/web-dist/{rel}",
                    fpath.read_bytes(),
                    0o100644,
                )

    shutil.copy2(out_zip, out_dmg)

    # Generate blockmaps if app-builder.exe is available
    app_builder_candidates = list(ROOT.rglob("app-builder.exe"))
    if app_builder_candidates:
        app_builder = str(app_builder_candidates[0])
        for pkg in [out_zip, out_dmg]:
            bm = Path(str(pkg) + ".blockmap")
            subprocess.run([app_builder, "blockmap", "-i", str(pkg), "-o", str(bm)], check=False)

    def file_meta(p: Path) -> dict:
        data = p.read_bytes()
        import base64
        sha512 = base64.b64encode(hashlib.sha512(data).digest()).decode("ascii")
        return {"url": p.name, "sha512": sha512, "size": len(data)}

    return {"zip": file_meta(out_zip), "dmg": file_meta(out_dmg)}


def main():
    asar_hash = compute_asar_header_hash(ASAR_PATH)
    print(f"Computed app.asar header hash: {asar_hash}")
    arm64_meta = build_mac_arch("arm64", asar_hash)
    x64_meta = build_mac_arch("x64", asar_hash)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    all_files = [arm64_meta["zip"], arm64_meta["dmg"], x64_meta["zip"], x64_meta["dmg"]]
    lines = [
        f"version: {VERSION}",
        "files:",
    ]
    for fm in all_files:
        lines.append(f"  - url: {fm['url']}")
        lines.append(f"    sha512: {fm['sha512']}")
        lines.append(f"    size: {fm['size']}")
    lines.append(f"path: {arm64_meta['zip']['url']}")
    lines.append(f"sha512: {arm64_meta['zip']['sha512']}")
    lines.append(f"releaseDate: '{now_iso}'")

    latest_mac = DIST_DIR / "latest-mac.yml"
    latest_mac.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {latest_mac}")


if __name__ == "__main__":
    main()
