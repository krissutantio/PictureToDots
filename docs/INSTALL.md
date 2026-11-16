# Install on iPhone / iPad

## Use the Home Screen web app

After this version is deployed over HTTPS:

1. Open [PictureToDots](https://krissutantio.github.io/PictureToDots/) in Safari.
2. Tap Share, then **Add to Home Screen**. If the action is hidden, add it from
   Safari's Edit Actions menu.
3. Leave **Open as Web App** enabled if that option is shown, then tap **Add**.
4. Open the new Paper & Pigment icon. It should launch as a standalone app, with
   its own Home page, instead of an ordinary Safari tab.

See [Apple's current instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27).
Older Safari standalone behavior is configured by the Apple metadata as well as
`display: standalone` in the manifest; see [WebKit's description](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).
This is an installed web app, not an App Store binary. iOS controls installation;
there is no JavaScript button that can silently install it.

## Offline and storage behavior

- First open online and let the app finish loading. Its shell, manifest and icons
  are cached for subsequent offline launches.
- Vision assets are downloaded from this same site on demand. A model works
  offline after a successful load; uncached models fall back to generic saliency.
- Photos, projects, notebooks and palettes stay local to the browser/installation.
  Do not assume data is shared between Safari and a Home Screen installation or
  synchronized to another device. Export/import project and notebook backups.
- Browser/OS storage eviction, removing an app or clearing website data can remove
  local data. Installation is not a substitute for backups.
- After a deployment, reopen online to download an update. If the old version
  remains, close all windows/tabs of the app and relaunch so the waiting service
  worker can activate. Existing processing jobs are not forcibly interrupted.

## Implementation

- `public/manifest.webmanifest`: relative start URL, scope and identity work at
  `/PictureToDots/` as well as a domain root; standalone display and theme colors.
- `public/icons/`: local SVG brand mark, 192/512px manifest PNGs, 180px Apple touch
  icon. `node scripts/generate-icons.mjs` regenerates PNGs from the SVG using the
  installed Playwright Chromium, without external assets.
- `index.html`: manifest/icon links, Apple standalone/title/status-bar metadata,
  theme color and safe-area viewport support.
- `scripts/service-worker.mjs`: precaches install resources and includes their
  bytes in the cache version. Vision files remain lazily cached.

## Verification limits

Production Chromium tests verify manifest scope/standalone settings, Apple icon
metadata/dimensions, subpath resources, offline shell/icon/manifest access and
cached inference. They cannot exercise Safari's Share sheet or prove real-device
iOS standalone behavior. Install and launch on a physical iPhone/iPad, then test
upload, crop, save/reopen, export, offline relaunch and updating before claiming
complete iOS verification.
