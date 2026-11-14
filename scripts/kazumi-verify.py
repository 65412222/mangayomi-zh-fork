#!/usr/bin/env python3
"""回归验证一个 Kazumi 规则目录：逐条规则跑「搜索 → 详情 → 分集」。

用法：
    python3 scripts/kazumi-verify.py kazumi-adapted 来自深渊 脑洞学生会
    python3 scripts/kazumi-verify.py kazumi-adapted          # 用默认样品

输出每行一条规则×一个样品：roads=线路数 eps=[各线路集数]。
「集数」是各线路分别计数，多线路互为镜像时取最大值才是真实集数。
"""
import json
import os
import re
import subprocess
import sys
import urllib.parse

try:
    from lxml import html as LH
except ImportError:
    sys.exit("需要 lxml: pip3 install --user lxml")

UA = ("Mo" "zilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36")
DEFAULT_TITLES = ["来自深渊", "脑洞学生会"]


def get(url, ref=None, timeout=18):
    cmd = ["curl", "-s", "-m", str(timeout), "-L", "-A", UA,
           "-H", "Accept-Language: zh-CN,zh;q=0.9", "-H", "Referer: " + (ref or url), url]
    return subprocess.run(cmd, capture_output=True, text=True).stdout or ""


def q(node, expr, relative=True):
    if not expr:
        return []
    cands = [("." + expr), expr] if (relative and expr.startswith("//")) else [expr]
    for c in cands:
        try:
            r = node.xpath(c)
            if r:
                return r
        except Exception:
            continue
    return []


def walk(obj, path):
    """极简 JSONPath：支持 $.a.b[*].c 与 [*]。"""
    if not path:
        return []
    p = path[1:] if path.startswith("$") else path
    cur = [obj]
    for part in [x for x in re.split(r"\.(?![^\[]*\])", p) if x]:
        star = part.endswith("[*]")
        key = part[:-3] if star else part
        nxt = []
        for c in cur:
            pool = c if isinstance(c, list) else (c.get(key) if isinstance(c, dict) else None)
            if pool is None:
                continue
            if star:
                nxt.extend(pool if isinstance(pool, list) else [pool])
            else:
                nxt.append(pool)
        cur = nxt
    return cur


def first(v):
    return v[0] if isinstance(v, list) and v else (v if v is not None else "")


def run(path, kw):
    d = json.load(open(path))
    base = d["baseURL"].rstrip("/") + "/"
    hits = []
    if d.get("searchMode") == "api":
        sc = d["searchApiConfig"]
        url = sc["request"]["url"]
        qs = "&".join("%s=%s" % (k, urllib.parse.quote(str(v).replace("@keyword", kw)))
                      for k, v in sc["request"]["query"].items())
        raw = get(url + ("&" if "?" in url else "?") + qs, base)
        try:
            js = json.loads(raw)
        except Exception:
            return "search-json-fail(%dB)" % len(raw)
        rows = walk(js, sc.get("listPath", ""))
        tmpl = sc.get("sourceTemplate", "")
        hits = [("%s" % first(walk(r, sc.get("namePath", ""))),
                 tmpl.replace("@source", str(first(walk(r, sc.get("sourcePath", "")))))) for r in rows[:2]]
    else:
        surl = (d.get("searchURL") or "").replace("@keyword", urllib.parse.quote(kw))
        raw = get(surl, base)
        if not raw.strip():
            return "search-empty"
        doc = LH.fromstring(raw)
        for nd in q(doc, d.get("searchList", ""), relative=False)[:4]:
            nm = q(nd, d.get("searchName", ""))
            hl = q(nd, d.get("searchResult", ""))
            t = nm[0].text_content().strip() if nm and hasattr(nm[0], "text_content") else ""
            h = hl[0].get("href", "") if hl and hasattr(hl[0], "get") else ""
            if t and h:
                hits.append((t, h))
    if not hits:
        return "no-hits"

    out = []
    for t, h in hits[:2]:
        if d.get("chapterMode") == "api" and d.get("chapterApiConfig"):
            cc = d["chapterApiConfig"]
            url = cc["request"]["url"]
            qs = "&".join("%s=%s" % (k, urllib.parse.quote(str(v).replace("@source", str(h))))
                          for k, v in cc["request"]["query"].items())
            raw = get(url + ("&" if "?" in url else "?") + qs, base)
            try:
                js = json.loads(raw)
            except Exception:
                out.append("%s: chapter-json-fail(%dB)" % (t[:16], len(raw)))
                continue
            eps = walk(js, cc.get("roadEpisodesPath", ""))
            sep = cc.get("episodeSeparator", "#")
            counts = [len([x for x in str(e).split(sep) if x.strip()]) for e in eps[:4]]
            out.append("%s: api-roads=%d eps=%s" % (t[:16], len(eps), counts))
            continue
        url = h if h.startswith("http") else urllib.parse.urljoin(base, h.lstrip("/"))
        page = get(url, base)
        if not page.strip():
            out.append("%s: detail-empty" % t[:16])
            continue
        doc2 = LH.fromstring(page)
        roads = q(doc2, d.get("chapterRoads", ""), relative=False)
        counts = [len([x for x in q(r, d.get("chapterResult", "")) if hasattr(x, "get") and x.get("href")])
                  for r in roads]
        out.append("%s: roads=%d eps=%s" % (t[:16], len(roads), counts[:4]))
    return " | ".join(out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    catalog = sys.argv[1]
    titles = sys.argv[2:] or DEFAULT_TITLES
    for fn in sorted(os.listdir(catalog)):
        if not fn.endswith(".json") or fn == "index.json":
            continue
        for kw in titles:
            print("%-10s %-8s -> %s" % (fn[:-5], kw, run(os.path.join(catalog, fn), kw)), flush=True)
