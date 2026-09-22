---
name: android-capacitor-e2e
description: How to run + debug the Capacitor Android wrapper on this box — emulator bring-up (KVM fix, system image), APK install, WebView CDP eval via webview_devtools_remote, adb input coordinate mapping, and the cap-sync staleness gotcha.
---

# Android Capacitor E2E testing

## Environment
- Repo: `~/repos/Prompt-Lab`, Capacitor 8 project in `android/` (appId `app.promptlab.twa`).
- `server.url=https://prompt-lab.xyz` in `capacitor.config.json` — the WebView loads the LIVE site; `/` renders the marketing landing page, `/app` renders the app shell.
- Env: `export NVM_DIR=~/.nvm; . $NVM_DIR/nvm.sh` (Node 24), `JAVA_HOME=~/jdk21`, `ANDROID_SDK_ROOT=~/android-sdk`. Gradle init script `~/.gradle/init.d/maven-mirror.gradle` mirrors Maven Central — keep it.

## Emulator bring-up
- If `~/android-sdk` lacks `emulator`/`system-images`, install via sdkmanager (needs JAVA_HOME):
  `yes | ~/android-sdk/cmdline-tools/latest/bin/sdkmanager "emulator" "system-images;android-36-ext19;google_apis_playstore;x86_64"`
- KVM: emulator fails with "x86_64 emulation currently requires hardware acceleration" if `/dev/kvm` isn't accessible. User `ubuntu` is NOT in the kvm group; `sudo` is passwordless here → `sudo chmod 666 /dev/kvm`.
- Create: `~/android-sdk/cmdline-tools/latest/bin/avdmanager create avd -n captest -k "system-images;android-36-ext19;google_apis_playstore;x86_64" -d pixel_6`
- Boot visibly: `DISPLAY=:0 ~/android-sdk/emulator/emulator -avd captest -gpu swiftshader_indirect -no-boot-anim` — window appears on the desktop; poll `adb -s emulator-5554 shell getprop sys.boot_completed`.
- Nested virtualization: expect `Process system isn't responding` / SystemUI ANR dialogs early in boot (load avg >30 while zygote churns). Click "Wait" or ignore; they settle. A one-time zygote64 SIGABRT + WebView PowerMonitor crash happened under load — env-level, not the app.

## Driving the app
- Install: `adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk`. Rebuild: `cd android && JAVA_HOME=~/jdk21 ANDROID_SDK_ROOT=~/android-sdk ./gradlew assembleDebug`.
- Launch: `adb shell am start -n app.promptlab.twa/.MainActivity` (monkey also works).
- Mouse clicks via computer-use work on the emulator window at SCREEN coords. `type` does NOT reach WebView fields — use `adb shell input text` instead.
- `adb shell input tap x y` takes DEVICE pixels (1080x2400), not screen coords. Map: `devX ≈ (screenX−65)*4.15`, `devY ≈ (screenY−85)*4.17` (verify by screenshot after each fill; fields can race focus — retype if empty).

## WebView CDP (best way to exercise native plugins / read page state)
- Debug builds enable WebView debugging. Find socket: `adb shell cat /proc/net/unix | grep webview_devtools_remote` → e.g. `webview_devtools_remote_<pid>` (pid changes on reinstall — re-forward).
- `adb -s emulator-5554 forward tcp:9223 localabstract:webview_devtools_remote_<pid>` then `curl localhost:9223/json` lists page targets.
- `Runtime.evaluate` via a Node WebSocket (Node 24 has global WebSocket): send `{method:"Runtime.evaluate",params:{expression,awaitPromise:true,returnByValue:true}}` to the target's `webSocketDebuggerUrl`. Lets you call `Capacitor.Plugins.<Plugin>.<method>()` directly — proves plugin registration + error handling without UI auth.
- chrome://inspect in desktop Chrome also works for interactive debugging.

## Deep links / App Links
- Debug APKs can't autoVerify (`assetlinks.json` is signed-release-only). `adb shell am start -a VIEW -d https://prompt-lab.xyz/...` opens Chrome by default. Force-enable: `adb shell pm set-app-links --package app.promptlab.twa 1 all` → `pm get-app-links app.promptlab.twa` should show `prompt-lab.xyz: verified`.
- After that, VIEW intents bring MainActivity to front; whether the WebView navigates depends on `Capacitor.Plugins.App` existing (check via CDP: `Object.keys(Capacitor.Plugins)`).

## Testing dev-build features inside the app (repointed server.url)
- To exercise new frontend code in the WebView (prod site lacks it): set `server.url=http://10.0.2.2:5173/app` + `server.cleartext=true` + `androidScheme:"http"`, `npx cap sync android`, rebuild, install. Vite binds 0.0.0.0:5173 so the emulator's NAT alias `10.0.2.2` reaches it.
- `apiBase` in dev builds is `http://127.0.0.1:8787` (main.jsx) — inside the emulator that is the DEVICE loopback → `adb reverse tcp:8787 tcp:8787` forwards it to the host API.
- **CORS trap**: `server/index.js` `allowedCorsOrigins` is localhost:5173/4173 only, so API calls from the app origin (`http://10.0.2.2:5173`) are rejected (400/`Failed to fetch`) — expected in repointed-dev testing; production is same-origin (`apiBase=""`) so unaffected. To fully test API flows in-app, temporarily add the origin to the allowlist.
- `window.prompt`/`alert` surface as NATIVE dialogs that block the page's JS (CDP `Runtime.evaluate` times out until dismissed). Type into the field via `adb shell input text` after tapping it — first attempt can miss; screencap to verify before OK.
- CDP `/json` target list includes ad/preview iframes (e.g. `googleads.g.doubleclick.net`) — pick the app target by URL filter, not just `type==="page"`.

## Headless fallback when the desktop is dead
- `emulator -avd captest -no-window -gpu swiftshader_indirect` needs no X server at all. Drive everything via `adb` + WebView CDP + `adb exec-out screencap -p > shot.png` (PNG is 1080x2400 device pixels — the same coords `input tap` wants).
- `setsid <cmd> < /dev/null > log 2>&1 &` detaches background processes from the exec shell's process group.
- If the whole desktop dies (VNC/enigo dead), check `systemctl status vncserver.service` (Xtigervnc :0 → port 5901) — `sudo -n systemctl restart vncserver.service` restores the X server; session UI (`~/.vnc/xstartup` is `sleep infinity`) is driven by the harness, which may need its own recovery.

## ML Kit document scanner on emulator
- Works: first "Pindai dokumen" tap downloads the scanner module via Play services (needs Play Store image), then the real Google scanner UI opens (camera preview, Auto/Manual capture, gallery, Filters/Crop&rotate review).
- Returning to the app can RELOAD the WebView (low-memory process death) — the scan result and in-flight template state are silently lost; verify via `performance.getEntriesByType('navigation')[0].type === 'reload'`.

## Gotchas
- **Stale sync**: `android/app/src/main/assets/capacitor.config.json` is generated (untracked) by `npx cap sync android`. If it predates a `capacitor.config.json` edit, the built APK silently drops new keys (e.g. `allowNavigation` missing → OAuth jumps to external Chrome). Always `npx cap sync` + rebuild before trusting APK behavior. `npm run playstore:build` already includes sync.
- Local `npm run dev` has no Supabase env → auth shows "Supabase not configured" (guest mode works). The live site in the app IS configured; email sign-up still requires email confirmation.
- `npm run server` (Express :8787) is separate — without it the web console shows `ERR_CONNECTION_REFUSED /api/health`.

## Dead computer-use fallback (browser automation without the desktop tool)
- If the computer-use channel dies (enigo/VNC input dead) but Chrome is needed: launch Chrome-for-Testing yourself — `/opt/.devin/chrome/chrome/linux-*/chrome-linux64/chrome --remote-debugging-port=9222 --user-data-dir=$HOME/.browser_data_dir` on DISPLAY :0. The harness profile keeps guest/lang/library IDB state.
- Drive it over CDP only: `Runtime.evaluate` for clicks/scrolls/typing into inputs, `DOM.setFileInputFiles` for file-pick attachments (dropzone still shows "browse" input), `Page.captureScreenshot` for evidence.
- Files the page must read can be served via the dev server's `/@fs/` endpoint or inlined as base64 `data:` and fed through `DOM.setFileInputFiles`/`fetch` → `File` construction in page JS.
- ProseMirror/Tiptap editors: focus the node then `document.execCommand('insertText', false, text)` — synthetic key events don't reach the editor state.
- `recording_start` still captures the VNC framebuffer even when the input channel is dead — screen recording works for evidence.
