#!/usr/bin/env python3
"""Build kazumi/index.json from the mirrored rule files in this directory."""
import json, os, datetime

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kazumi")
HERE = os.path.abspath(HERE)
dates = {
    "MXdm": "2026-10-01T11:19:57Z",
    "akianime": "2026-08-17T05:00:25Z",
    "DM84": "2026-02-02T07:03:07Z",
    "giriGiriLove": "2026-11-13T14:01:25Z",
    "moonci": "2026-10-19T09:15:54Z",
    "LMM": "2026-11-13T07:17:06Z",
    "dalvdm": "2026-10-15T07:25:12Z",
}
items = []
for fn in sorted(os.listdir(HERE)):
    if not fn.endswith(".json") or fn == "index.json":
        continue
    stem = fn[:-5]
    d = json.load(open(os.path.join(HERE, fn)))
    ts = dates.get(stem) or dates.get(d.get("name", ""))
    ms = 0
    if ts:
        ms = int(datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
                 .replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
    items.append({
        "name": stem,
        "version": str(d.get("version", "")),
        "useNativePlayer": bool(d.get("useNativePlayer", True)),
        "antiCrawlerEnabled": bool(d.get("antiCrawlerEnabled", False)),
        "author": "",
        "lastUpdate": ms,
    })

json.dump(items, open(os.path.join(HERE, "index.json"), "w"), ensure_ascii=False, indent=2)
print(json.dumps(items, ensure_ascii=False, indent=2))
print("entries:", len(items))
