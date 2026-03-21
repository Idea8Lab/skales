# Skales - macOS Installation Guide

## Download
- **Apple Silicon (M1-M4):** [Skales-7.2.0-arm64.dmg](https://skales.app)
- **Intel Mac:** [Skales-7.2.0-x64.dmg](https://skales.app)

## Install
1. Open the DMG file
2. Drag Skales to Applications
3. Launch Skales from Applications

## Code Signing
Skales is signed with an Apple Developer ID (Mario Simic, Q5ASU2DB6P). Most users will not see any Gatekeeper warnings.

## Troubleshooting

**If macOS shows "Skales can't be opened":**
Right-click the app → Open → click Open in the dialog. This only needs to be done once.

**If that doesn't work:**
```
sudo xattr -rd com.apple.quarantine /Applications/Skales.app
```

**"Skales is damaged and can't be opened":**
This means the quarantine flag is set. Run the xattr command above.

## Uninstall
1. Quit Skales (click "Stop Server" in the sidebar)
2. Delete Skales from Applications
3. Optionally delete your data: `rm -rf ~/.skales-data`