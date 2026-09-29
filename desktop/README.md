# NIGHTFALL desktop build

The desktop app is an Electron shell around the production web build
(`dist/`). It serves the game from a local-only HTTP server on the fixed
origin **`http://127.0.0.1:41730`** and shows it in one window.

| File | Role |
| --- | --- |
| `main.cjs` | Electron main process: single instance, window, menus, shortcuts, navigation guards, IPC |
| `server.cjs` | Static file server (no Electron dependency, unit tested in `tests/desktop/`) |
| `windowState.cjs` | Remembers window bounds / maximized / fullscreen in `<userData>/window-state.json` |
| `preload.cjs` | Sandboxed preload exposing `window.nightfallDesktop` |
| `../src/shell/desktopBridge.js` | Game-side wrapper with browser fallbacks |
| `../build/` | Icons (`npm run icons` regenerates them) and mac entitlements |
| `../packaging/steam/` | SteamPipe app/depot build templates |

## Saves: do not change these

Saves are `localStorage`, keyed by the **userData folder** and the **origin**:

- userData is pinned in `main.cjs` to `<appData>/nightfall`
  (`~/Library/Application Support/nightfall`, `%APPDATA%\nightfall`,
  `~/.config/nightfall`), the same folder earlier builds used.
- The origin is `127.0.0.1:41730` (`APP_HOST` / `APP_PORT` in `server.cjs`).

If you change either one, every player's archive disappears. Changing the
`appId` or `productName` is safe. The NSIS uninstaller keeps saves
(`deleteAppDataOnUninstall: false`).

If port 41730 is already taken, the app shows a Try Again / Quit dialog. It
tells players whether the port is held by another NIGHTFALL build (it checks
`/__nightfall/ping` and the page title) or by an unrelated program.

## Behaviour

- One instance at a time. Launching again focuses the open window.
- The first launch opens fullscreen. After that the app restores the last
  window size, position and fullscreen state.
- Fullscreen toggles: **F11** on every platform, **Alt+Enter** on
  Windows/Linux, **Ctrl+Cmd+F** or View → Toggle Full Screen on macOS. The
  title menu's Settings button and the **F** key also work. On desktop they
  use native window fullscreen, which stays on when the game moves between
  chapter pages.
- macOS gets a minimal menu (About, Hide, Quit, Edit, Toggle Full Screen,
  Window). Windows and Linux get no menu bar.
- Links to other sites (for example in the credits) open in the system
  browser. The game window can only navigate within its own origin, and it
  never opens extra windows or webviews.
- Packaged builds have DevTools disabled. When you run it unpacked
  (`npm run desktop`), use F12 or Ctrl/Cmd+Shift+I for DevTools and
  Ctrl+R to reload.
- Caching: content-hashed `dist/assets/*-<hash>.*` files are cached as
  `immutable`. Everything else is `no-cache` with ETag/Last-Modified, so the
  chapter preloader's `force-cache` warm-up still works. The HTTP cache is
  cleared once after each version change (saves are not touched).
- The display stays awake while the window has focus, so long cinematics
  don't dim the screen. Audio and video can autoplay without a click.
- The title screen's QUIT GAME calls `window.nightfallDesktop.quit()`.

Renderer API, available only in the desktop app:

```js
window.nightfallDesktop = {
  isDesktop: true, platform,            // 'darwin' | 'win32' | 'linux'
  quit(), toggleFullscreen(), setFullscreen(bool), isFullscreen(), getVersion(), // Promises
  onFullscreenChange(cb) /* -> unsubscribe */,
};
```

## Building

Prerequisites: Node 20+ and `npm ci`. The first packaging run downloads the
Electron runtime (and NSIS on Windows) from GitHub.

| Command | Output in `release/desktop/` | Build on |
| --- | --- | --- |
| `npm run desktop` | runs the unpacked app from `dist/` | any |
| `npm run package:mac` | `NIGHTFALL-1.0.0-mac.dmg`, `NIGHTFALL-1.0.0-mac-universal.zip` | macOS only |
| `npm run package:win` | `NIGHTFALL-1.0.0-win-setup.exe` (NSIS, per-user), `NIGHTFALL-1.0.0-win-x64.zip` | Windows. On macOS/Linux the NSIS step needs Wine; the zip and `win-unpacked/` build without it |
| `npm run package:linux` | `NIGHTFALL-1.0.0-linux-x86_64.AppImage`, `linux-unpacked/` | Linux or macOS |
| `npm run package:steam` | `win-unpacked/`, `linux-unpacked/`, `mac-universal/NIGHTFALL.app` | macOS builds all three. Elsewhere the mac step fails last |
| `npm run package:steam:{win,mac,linux}` | a single unpacked folder | as above |

Every `package:*` script runs `npm run build` first. Run `npm run
test:desktop` to test the server and window-state logic.

The build config is the `"build"` block in `package.json`. It sets
`publish: null`, so no `app-update.yml` and no auto-updater are shipped (Steam
and itch handle updates). It also enables asar, Electron fuses (no
`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` or `--inspect`, app code only from
asar) and English-only Chromium locales. The OFL font licenses are copied to
`resources/licenses/`.

### macOS: signing and notarization

By default `mac.identity` is `null`, so the build is **unsigned**. That's fine
for local testing. Steam doesn't quarantine downloads, so an unsigned build
usually launches from Steam, but Valve recommends notarizing. When players
download from a browser (for example from itch.io), Gatekeeper blocks
unsigned apps with an "app is damaged" message. **Sign and notarize every
public mac build:**

1. Join the Apple Developer Program. In Xcode → Settings → Accounts →
   Manage Certificates, create a **Developer ID Application** certificate. It
   goes into your login keychain.
2. In App Store Connect → Users and Access → Integrations → App Store Connect
   API, create a key with the *Developer* role. Download the `.p8` file and
   note the Key ID and Issuer ID.
3. Build, sign and notarize:

   ```sh
   export APPLE_API_KEY="$HOME/keys/AuthKey_ABC123XYZ.p8"
   export APPLE_API_KEY_ID="ABC123XYZ"
   export APPLE_API_ISSUER="00000000-0000-0000-0000-000000000000"
   npm run build
   npx electron-builder --mac --universal --publish never \
     -c.mac.identity="Your Name (TEAMID1234)" \
     -c.mac.notarize=true
   ```

   Leave off the `Developer ID Application:` prefix. For a Steam depot, add
   `--dir`, which notarizes `mac-universal/NIGHTFALL.app`. Instead of an API
   key you can also set `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` +
   `APPLE_TEAM_ID`. On CI, set `CSC_LINK` (base64 `.p12`) and
   `CSC_KEY_PASSWORD` too.
4. Verify:
   `spctl -a -vvv -t exec release/desktop/mac-universal/NIGHTFALL.app` should
   report `source=Notarized Developer ID`, and
   `xcrun stapler validate release/desktop/NIGHTFALL-1.0.0-mac.dmg` should
   succeed.

The hardened runtime uses `build/entitlements.mac.plist` (JIT and
library-validation exceptions that Electron needs).

### Windows code signing (optional)

Without signing, SmartScreen shows "Windows protected your PC" for the
installer and zip downloads. It doesn't show for games launched through
Steam. To sign, set `CSC_LINK` / `CSC_KEY_PASSWORD` (a `.pfx`) or configure
`win.azureSignOptions` for Azure Trusted Signing, and build on Windows.

## Steam (SteamPipe)

1. In Steamworks, create one depot per OS (Windows, macOS, Linux + SteamOS).
   Replace the placeholder IDs in `packaging/steam/*.vdf`: app `1000000`,
   depots `1000001` (Windows), `1000002` (macOS) and `1000003` (Linux).
2. Launch options (Steamworks → Installation → General):
   - Windows: executable `NIGHTFALL.exe`
   - macOS: executable `NIGHTFALL.app`
   - Linux/SteamOS: executable `nightfall`, arguments `--no-sandbox`. Steam
     drops the setuid bit that `chrome-sandbox` needs.
3. Build the folders on a Mac (sign and notarize the mac one first, see
   above): `npm run package:steam`.
4. Upload with [steamcmd](https://developer.valvesoftware.com/wiki/SteamCMD)
   (or the SDK's `tools/ContentBuilder/builder*/steamcmd`):

   ```sh
   steamcmd +login <build_account> +run_app_build "$PWD/packaging/steam/app_build.vdf" +quit
   ```

   Set `"Preview" "1"` in `app_build.vdf` for a dry run. Then set the new
   build live on a branch under Steamworks → SteamPipe → Builds.

Notes: the Steam overlay and achievements aren't integrated, because the game
doesn't use the Steamworks SDK. On Steam Deck, the game is keyboard/mouse
driven, so it needs a Steam Input keyboard template.

## itch.io (butler)

Push the unpacked folders. Butler diffs them, so updates stay small:

```sh
butler login
butler push release/desktop/win-unpacked    <itch-user>/nightfall:windows --userversion 1.0.0
butler push release/desktop/mac-universal   <itch-user>/nightfall:mac     --userversion 1.0.0   # signed + notarized
butler push release/desktop/linux-unpacked  <itch-user>/nightfall:linux   --userversion 1.0.0
butler status <itch-user>/nightfall
```

You can also upload the installer/zip/dmg/AppImage artifacts, for example
`butler push release/desktop/NIGHTFALL-1.0.0-win-setup.exe
<itch-user>/nightfall:windows-installer`. Players without the itch app
download these directly, so sign the mac build.

## Verifying a build by hand

- Open the game with networking turned off. The final-boss pages use Anton /
  Space Mono, bundled from `src/fonts/`. Nothing is fetched from
  fonts.googleapis.com.
- Toggle fullscreen with each shortcut and with Settings → TOGGLE
  FULLSCREEN. Quit, relaunch, and check that the mode and window size come
  back.
- Launch the app twice and check that the second launch focuses the first
  window.
- Open Credits → an external link. It should open in the system browser.
- Title → QUIT GAME → QUIT should close the app.
- Continue should show an existing save after updating from an older build.

## Building on GitHub instead of locally

`.github/workflows/desktop-release.yml` builds all three platforms on GitHub's
runners whenever a `release/*` branch or a `v*` tag is pushed (or via
**Actions → desktop-release → Run workflow**). Download the packages from the
run's **Artifacts** section. macOS builds there are ad-hoc signed; add the
Apple secrets listed in the workflow header for a notarized build.
