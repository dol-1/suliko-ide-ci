# Windows NotSigned: safe verification and platform boundaries (preview)

**PRE-BETA INFORMATION ONLY — no Suliko installer is distributed or approved for personal or production use.** Source: [official reviewed BB desktop-v0.49.0 release](https://github.com/get-bb/bb/releases/tag/desktop-v0.49.0) and [installation status](install.en.md). This page does not recommend installation, user enrollment or bypassing security warnings.

## SHA-256 is an integrity check, not an Authenticode publisher signature

The reviewed official upstream Windows package is **NotSigned**. You can compare the SHA-256 of a file already obtained from an authorized source with the **independently obtained official release digest**. Never invent or guess the expected value. The example below **only reads a file**; the path is a placeholder, not a download, execution or install instruction.

```powershell
$ApprovedFile = 'C:\reviewed\bb-installer.exe' # Placeholder path only
Get-FileHash -LiteralPath $ApprovedFile -Algorithm SHA256
```

If no official expected SHA-256 is available, or if values differ, **stop**. Do not run the file. Even a matching SHA-256 does **not** prove that Microsoft/Windows verified who published it.

## SmartScreen and NotSigned

Windows SmartScreen may warn when a publisher is unverified. **Do not disable SmartScreen, change system protection settings, or bypass a warning.** Stop and consult trusted release documentation or an authorized administrator. Public CI's synthetic verification of a pinned unsigned installer is not a user installation approval.

## Windows: Desktop versus CLI

The official BB native **Windows GUI** is different from the command-line interface. The reviewed **BB CLI on Windows requires Ubuntu WSL2**; native PowerShell `bb project create` is not promised. Suliko's Remote panel is a **synthetic/mock**, not a real authorized connection. See [Windows installation status](install.en.md) and [troubleshooting](troubleshooting.en.md).

**Release gate:** no Windows publisher-signing approval, general public beta invitation or production Remote access is granted by this guide.