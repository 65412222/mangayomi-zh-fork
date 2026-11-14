#!/usr/bin/env python3
"""Rebuild index.json for a Kazumi rule catalog directory.

Usage: python3 scripts/kazumi-index.py [kazumi|kazumi-adapted]
name/version/useNativePlayer/antiCrawlerEnabled come from each rule file;
lastUpdate uses the upstream commit date when known, else the file mtime.
"""
import datetime
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRNAME = sys.argv[1] if len(sys.argv) > 1 else "kazumi"
TARGET = os.path.join(ROOT, DIRNAME)

# upstream commit dates (UTC) for rules mirrored from Predidit/KazumiRules
UPSTREAM_DATES = {
    "MXdm": "2026-10-01T11:19:57Z",
    "akianime": "2026-08-17T05:00:25Z",
    "DM84": "2026-02-02T07:03:07Z",
    "giriGiriLove": "2026-11-13T14:01:25Z",
    "moonci": "2026-10-19T09:15:54Z",
    "LMM": "2026-11-13T07:17:06Z",
    "dalvdm": "2026-10-15T07:25:12Z",
}


def to_ms(ts):
    return int(datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
               .replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)


items = []
for fn in sorted(os.listdir(TARGET)):
    if not fn.endswith(".json") or fn == "index.json":
        continue
    stem = fn[:-5]
    path = os.path.join(TARGET, fn)
    d = json.load(open(path))
    key = UPSTREAM_DATES.get(stem) or UPSTREAM_DATES.get(d.get("name", ""))
    ms = to_ms(key) if key else int(os.path.getmtime(path) * 1000)
    items.append({
        "name": stem,
        "version": str(d.get("version", "")),
        "useNativePlayer": bool(d.get("useNativePlayer", True)),
        "antiCrawlerEnabled": bool(d.get("antiCrawlerEnabled", False)),
        "author": "",
        "lastUpdate": ms,
    })

out = os.path.join(TARGET, "index.json")
json.dump(items, open(out, "w"), ensure_ascii=False, indent=2)
print(f"{out}: {len(items)} entries -> {[i['name'] for i in items]}")
