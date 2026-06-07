---
name: video-js workflow DIDNT_OPEN_A_PORT false alarms
description: When a video-js (vite) artifact workflow fails to "open a port" but the app actually serves fine.
---

A `video-js` (Vite) artifact workflow can fail `restart_workflow` with
`DIDNT_OPEN_A_PORT` even though the app is healthy.

**Why:** Vite uses `strictPort: true`. If anything else holds the assigned port,
Vite exits instead of incrementing. Common culprits during a first build:
restarting the workflow while the DESIGN subagent's own validation/preview server
is still up, or leftover manual test `vite` processes. The first restart firing
mid-subagent is the classic trigger.

**Also:** `ss`/`netstat` are unreliable in this sandbox — they can report nothing
listening while curl returns 200. Don't trust `ss` to decide whether the port is open.

**How to apply:** Before assuming the build is broken, verify the app actually
serves: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/<base>/`
and check `/proc/net/tcp` for the port in hex (LISTEN state `0A`). If it serves,
the failure is a port race: `pkill` stray vite/`<slug>` processes, confirm the
port is free, then restart the workflow once cleanly.
