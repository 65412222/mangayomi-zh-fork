const mangayomiSources = [{
  "name": "Mangabz",
  "lang": "zh",
  "baseUrl": "https://mangabz.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://mangabz.com",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/mangabz.js"
}];

// Dean Edwards packer 解包（chapterimage.ashx 回包用）：同 dm5.js 方子，10Comic/DM5Viewer 同源
function unpackPacker(p, a, c, k) {
  function e(c_) {
    var prefix = "";
    if (c_ >= a) prefix = e(Math.floor(c_ / a));
    var cc = c_ % a;
    var suffix = cc > 35 ? String.fromCharCode(cc + 29) : cc.toString(36);
    return prefix + suffix;
  }
  var out = p;
  for (var cc = c - 1; cc >= 0; cc--) {
    if (cc < k.length && k[cc]) {
      var word = e(cc);
      if (!word) continue;
      out = out.replace(new RegExp("\\b" + word + "\\b", "g"), k[cc]);
    }
  }
  return out;
}

// chapterimage 回包 eval(function(p,a,c,k,e,d){...}('...',25,25,'...'.split('|'),0,{}))
// 解包得 dm5imagefun() 内 pix + pvalue（实测 mangabz pix=https://image.mangabz.com/...）
function extractMbzImages(packedBody) {
  var m = packedBody.match(/}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)/s);
  if (!m) throw new Error("Mangabz: 取图包解析失败");
  var payload = m[1], a = parseInt(m[2]), c = parseInt(m[3]);
  var k = m[4].split("|");
  var code = unpackPacker(payload, a, c, k);
  var pix = "";
  var pm = code.match(/var pix="([^"]+)"/);
  if (pm && pm[1]) pix = pm[1];
  var arr = [];
  var am = code.match(/var pvalue=\[([^\]]*)\]/);
  if (am && am[1]) {
    var items = am[1].match(/"([^"]+)"/g) || [];
    for (var i = 0; i < items.length; i++) {
      arr.push(items[i].replace(/"/g, ""));
    }
  }
  var cid = "", key = "";
  var cm = code.match(/var cid=(\d+)/);
  if (cm && cm[1]) cid = cm[1];
  var km = code.match(/var key=\\?'([^'\\]+)\\?'/);
  if (km && km[1]) key = km[1];
  const out = [];
  for (const it of arr) {
    if (/^(https?:)?\/\//i.test(it)) { out.push(it); continue; }
    out.push(pix + it + "?cid=" + cid + "&key=" + key);
  }
  return out;
}

class DefaultExtension extends MProvider {
  baseURL() {
    try {
      const preference = new SharedPreferences();
      var base_url = preference.get("domain_url");
      if (base_url) {
        if (base_url.endsWith("/")) base_url = base_url.slice(0, -1);
        return base_url;
      }
    } catch (e) {}
    return this.source.baseUrl;
  }
  headers(referer) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }

  searchList(doc) {
    const items = [];
    try {
      const box = doc.selectFirst("ul.mh-list");
      if (!box) return items;
      for (const li of box.select("li")) {
        var a = null;
        try { a = li.selectFirst("h2.title a"); } catch (e) {}
        if (!a) continue;
        const href = a.getHref;
        const name = a.text.trim();
        if (!href || !name) continue;
        var img = "";
        try {
          const im = li.selectFirst("img.mh-cover");
          if (im) img = im.attr("src") || "";
        } catch (e) {}
        items.push({ name: name, imageUrl: img, link: href });
      }
    } catch (e) {}
    return items;
  }

  async getPopular(page) {
    return await this.search("海贼", page || 1, []);
  }

  async getLatestUpdates(page) {
    return await this.search("更新", page || 1, []);
  }

  async search(query, page, filters) {
    const p = page || 1;
    var url = this.baseURL() + "/search?title=" + encodeURIComponent(query);
    if (p > 1) url += "&page=" + p;
    const res = await new Client().get(url, this.headers());
    const doc = new Document(res.body);
    const list = this.searchList(doc);
    return { list: list, hasNextPage: list.length > 0 && p < 5 };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers());
    const doc = new Document(res.body);
    var title = "";
    try { title = doc.selectFirst("title").text.trim().split("漫畫")[0].trim(); } catch (e) {}
    const eps = [];
    try {
      for (const a of doc.select('a[href*="/m"]')) {
        const href = a.getHref;
        if (!href || !href.match(/^\/m\d+\/$/)) continue;
        var name = "";
        try { name = a.attr("title") || a.text.trim(); } catch (e) { name = a.text.trim(); }
        if (!name) name = href;
        eps.push({ name: name.trim(), url: href });
      }
    } catch (e) {}
    const seen = {};
    const uniq = [];
    for (const e of eps) {
      if (!seen[e.url]) { seen[e.url] = 1; uniq.push(e); }
    }
    return {
      name: title,
      imageUrl: "",
      description: "",
      genre: [],
      author: "",
      status: 2,
      chapters: uniq
    };
  }

  async getPageList(url) {
    const cid = (url.match(/\/m(\d+)\/?/) || [])[1];
    if (!cid) throw new Error("Mangabz: 章节ID非法");
    const chUrl = this.baseURL() + "/m" + cid + "/";
    const chRes = await new Client().get(chUrl, this.headers());
    const html = chRes.body;
    const mid = (html.match(/var MANGABZ_MID=(\d+)/) || [])[1];
    const cnt = parseInt((html.match(/var MANGABZ_IMAGE_COUNT=(\d+)/) || [])[1] || "0");
    const sign = (html.match(/var MANGABZ_VIEWSIGN="([^"]*)"/) || [])[1];
    const dt = (html.match(/var MANGABZ_VIEWSIGN_DT="([^"]*)"/) || [])[1];
    if (!mid || !sign || !dt) throw new Error("Mangabz: 拿不到取图签名（可能付费章节）");
    const out = [];
    var page = 1;
    var guard = 0;
    while (guard < 30) {
      guard++;
      const cfUrl = this.baseURL() + "/m" + cid + "/chapterimage.ashx?cid=" + cid +
        "&page=" + page + "&key=&_cid=" + cid + "&_mid=" + mid +
        "&_dt=" + encodeURIComponent(dt) + "&_sign=" + sign;
      const cfRes = await new Client().get(cfUrl, this.headers(chUrl));
      const imgs = extractMbzImages(cfRes.body);
      if (!imgs.length) break;
      for (const im of imgs) out.push(im);
      if (imgs.length < 2) break;
      if (cnt && out.length >= cnt) break;
      page++;
    }
    if (!out.length) throw new Error("Mangabz: 取图为空");
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "Mangabz 镜像网址",
        "value": "https://mangabz.com",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
