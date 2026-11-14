#!/usr/bin/env python3
"""诊断一条 Kazumi 规则在哪一步断了。

用法：
    python3 scripts/kazumi-diag.py <catalog-dir> <rule-name> <keyword>
例：
    python3 scripts/kazumi-diag.py kazumi TvTFun 来自深渊

输出：搜索 API/页面的命中数、条目字段样本、详情页 chapterRoads 命中数，
以及「按 <a> 数量排序的容器候选」——改选择器时参照最后这一段挑稳定容器。

依赖：lxml（brew install python3 后 pip3 install --user lxml）
"""
import json
import os
import re
import subprocess
import sys
import urllib.parse
from collections import Counter

try:
    from lxml import html as LH
except ImportError:
    sys.exit("需要 lxml: pip3 install --user lxml")

UA = ("Mo" "zilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36")


def get(url, ref=None, timeout=18):
    cmd = ["curl", "-s", "-m", str(timeout), "-L", "-A", UA,
           "-H", "Accept-Language: zh-CN,zh;q=0.9", "-H", "Referer: " + (ref or url), url]
    return subprocess.run(cmd, capture_output=True, text=True).stdout or ""


def q(node, expr, relative=True):
    """按 Kazumi 语义求值：以 // 开头时优先相对求值，再退回绝对。"""
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


def brief(el, limit=60):
    if not hasattr(el, "tag"):
        return repr(el)[:limit]
    txt = re.sub(r"\s+", " ", el.text_content()).strip()[:40]
    cls = (el.get("class") or "")[:36]
    href = (el.get("href") or "")[:40]
    return "<%s class='%s' href='%s'> %s" % (el.tag, cls, href, txt[:limit])


def main(catalog, rule, kw):
    path = os.path.join(catalog, rule + ".json")
    d = json.load(open(path))
    base = d["baseURL"].rstrip("/") + "/"
    print("== %s (%s) api=%s mode=%s" % (d["name"], d.get("version"), d.get("api"), d.get("searchMode", "xpath")))

    hits = []
    if d.get("searchMode") == "api":
        sc = d["searchApiConfig"]
        url = sc["request"]["url"]
        qs = "&".join("%s=%s" % (k, urllib.parse.quote(str(v).replace("@keyword", kw)))
                      for k, v in (sc["request"].get("query") or {}).items())
        raw = get(url + ("&" if "?" in url else "?") + qs, base)
        print("search-api %s -> %dB" % (url[:90], len(raw)))
        try:
            js = json.loads(raw)
        except Exception:
            print("  !! JSON 解析失败，前 120 字：", raw[:120])
            return
        rows = ((js.get("data") or {}).get("items") or []) if isinstance(js.get("data"), dict) else []
        print("  rows=%d" % len(rows))
        for r in rows[:3]:
            print("   ", json.dumps(r, ensure_ascii=False)[:130])
        tmpl = sc.get("sourceTemplate", "")
        hits = [(r.get("name", ""), tmpl.replace("@source", str(r.get("slug", "")))) for r in rows[:3]]
    else:
        surl = (d.get("searchURL") or "").replace("@keyword", urllib.parse.quote(kw))
        raw = get(surl, base)
        print("search %s -> %dB" % (surl[:90], len(raw)))
        if not raw.strip():
            print("  !! 搜索页空响应（反爬或站点不可达）")
            return
        doc = LH.fromstring(raw)
        nodes = q(doc, d.get("searchList", ""), relative=False)
        print("  searchList 命中 %d 个节点" % len(nodes))
        for nd in nodes[:3]:
            nm = q(nd, d.get("searchName", ""))
            hl = q(nd, d.get("searchResult", ""))
            t = nm[0].text_content().strip() if nm and hasattr(nm[0], "text_content") else ""
            h = hl[0].get("href", "") if hl and hasattr(hl[0], "get") else ""
            print("   - name=%r href=%r" % (t[:30], h[:50]))
            if t and h:
                hits.append((t, h))

    if not hits:
        print("  !! 搜索阶段拿不到 (名称, 链接) 对")
        return

    t, h = hits[0]
    url = h if h.startswith("http") else urllib.parse.urljoin(base, h.lstrip("/"))
    page = get(url, base)
    print("detail %s -> %dB" % (url[:90], len(page)))
    if not page.strip():
        print("  !! 详情页空响应")
        return
    doc2 = LH.fromstring(page)
    roads = q(doc2, d.get("chapterRoads", ""), relative=False)
    print("  chapterRoads 命中 %d 个线路节点" % len(roads))
    for i, r in enumerate(roads[:4]):
        eps = [x for x in q(r, d.get("chapterResult", "")) if hasattr(x, "get") and x.get("href")]
        print("   road%d %s -> %d 集" % (i + 1, brief(r, 50), len(eps)))
    if not roads or sum(1 for r in roads[:4] for x in q(r, d.get("chapterResult", ""))) == 0:
        print("  !! 分集阶段 0 集，参考下面按 <a> 数量排序的容器候选：")
        cands = []
        for c in doc2.xpath("//ul|//ol|//section|//div"):
            na = len(c.xpath(".//a[@href]"))
            if na >= 3:
                cands.append((na, c))
        cands.sort(key=lambda x: -x[0])
        for na, c in cands[:8]:
            classes = Counter(a.get("class") for a in c.xpath(".//a[@href]")).most_common(2)
            print("    %4d a   %s  classes=%s" % (na, brief(c, 40), classes))


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
