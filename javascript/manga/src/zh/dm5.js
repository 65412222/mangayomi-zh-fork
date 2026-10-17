const mangayomiSources = [{
  "name": "动漫屋dm5",
  "lang": "zh",
  "baseUrl": "https://www.dm5.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://www.dm5.com",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/dm5.js"
}];

// Dean Edwards packer 解包（chapterfun.ashx 回包用）：移植自 10Comic/DM5Viewer 方子
function unpackPacker(p, a, c, k) {
  function e(c_) {
    var prefix = "";
    if (c_ >= a) prefix = e(Math.floor(c_ / a));
    var cc = c_ % a;
    var suffix = cc > 35 ? String.fromCharCode(cc + 29) : cc.toString(36);
    return prefix + suffix;
  }
  // while(c--) if(k[c]) p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])
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

// chapterfun 回包 eval(function(p,a,c,k,e,d){...}('...',31,31,'...'.split('|'),0,{}))
// 取出 packed 参数，解包后得 dm5imagefun() 内 pix + pvalue
function extractDm5Images(packedBody) {
  var m = packedBody.match(/'\((.*)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s);
  // 更稳：直接匹配 eval(function...}('PAYLOAD',A,C,'K'.split('|')
  if (!m) {
    m = packedBody.match(/}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)/s);
  }
  if (!m) throw new Error("动漫屋: 取图包解析失败");
  var payload = m[1], a = parseInt(m[2]), c = parseInt(m[3]);
  var k = m[4].split("|");
  var code = unpackPacker(payload, a, c, k);
  // code 内：var pix="https://...";var pvalue=["/1_xxx.jpg","/2_xxx.jpg"]
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
  // cid/key 后缀
  var cid = "", key = "";
  var cm = code.match(/var cid=(\d+)/);
  if (cm && cm[1]) cid = cm[1];
  // 解包后引号是转义形态 var key=\'xxx\'，兼容反斜杠
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
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }
  // 桌面 UA：移动页无签名，桌面页才有 DM5_IMAGE_COUNT/VIEWSIGN（实测）
  deskHeaders(referer) {
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
          const cov = li.selectFirst("p.mh-cover");
          if (cov) {
            const st = cov.attr("style") || "";
            const mm = st.match(/url\(([^)]+)\)/);
            if (mm && mm[1]) img = mm[1];
          }
        } catch (e) {}
        items.push({ name: name, imageUrl: img, link: href });
      }
    } catch (e) {}
    return items;
  }

  async getPopular(page) {
    // 动漫屋无榜单页热门；首页无榜单，popular 走搜索通配（实测搜索页 mh-list SSR）
    return await this.search("海贼", page || 1, []);
  }

  async getLatestUpdates(page) {
    return await this.search("更新", page || 1, []);
  }

  async search(query, page, filters) {
    const p = page || 1;
    // 实测 /search?title= 200 SSR mh-list；分页参数站方为 page，实测翻页回全站时停
    var url = this.baseURL() + "/search?title=" + encodeURIComponent(query);
    if (p > 1) url += "&page=" + p;
    const res = await new Client().get(url, this.headers());
    const doc = new Document(res.body);
    const list = this.searchList(doc);
    return { list: list, hasNextPage: list.length > 0 && p < 5 };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.deskHeaders());
    const doc = new Document(res.body);
    var title = "";
    try { title = doc.selectFirst("title").text.trim().split("漫画")[0].trim(); } catch (e) {}
    const eps = [];
    try {
      for (const ul of doc.select("ul.detail-list-select")) {
        for (const a of ul.select("a")) {
          const href = a.getHref;
          var name = "";
          try { name = a.attr("title") || a.text.trim(); } catch (e) { name = a.text.trim(); }
          if (!href || href.indexOf("/m") !== 0) continue;
          if (!name) name = href;
          eps.push({ name: name.trim(), url: href });
        }
      }
    } catch (e) {}
    // 去重保序（标题+链接双出，去掉空标题重复）
    const seen = {};
    const uniq = [];
    for (const e of eps) {
      const k = e.url;
      if (!seen[k]) { seen[k] = 1; uniq.push(e); }
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
    // url: /m787652/
    const cid = (url.match(/\/m(\d+)\/?/) || [])[1];
    if (!cid) throw new Error("动漫屋: 章节ID非法");
    const chUrl = this.baseURL() + "/m" + cid + "/";
    // 桌面页拿签名（移动页无 DM5_VIEWSIGN）
    const chRes = await new Client().get(chUrl, this.deskHeaders());
    const html = chRes.body;
    const mid = (html.match(/var DM5_MID=(\d+)/) || [])[1];
    const cnt = parseInt((html.match(/var DM5_IMAGE_COUNT=(\d+)/) || [])[1] || "0");
    const sign = (html.match(/var DM5_VIEWSIGN="([^"]*)"/) || [])[1];
    const dt = (html.match(/var DM5_VIEWSIGN_DT="([^"]*)"/) || [])[1];
    if (!mid || !sign || !dt) throw new Error("动漫屋: 拿不到取图签名（可能付费章节）");
    const out = [];
    var page = 1;
    var guard = 0;
    while (guard < 30) {
      guard++;
      const cfUrl = this.baseURL() + "/ch1-" + cid + "/chapterfun.ashx?cid=" + cid +
        "&page=" + page + "&key=&language=1&gtk=6&_cid=" + cid + "&_mid=" + mid +
        "&_dt=" + encodeURIComponent(dt) + "&_sign=" + sign;
      const cfRes = await new Client().get(cfUrl, this.deskHeaders(chUrl));
      const imgs = extractDm5Images(cfRes.body);
      if (!imgs.length) break;
      for (const im of imgs) out.push(im);
      // 每包回 2 图（实测 p1/p2 各 2 张）；收到数<2 或已达总数停
      if (imgs.length < 2) break;
      if (cnt && out.length >= cnt) break;
      page++;
    }
    if (!out.length) throw new Error("动漫屋: 取图为空");
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "动漫屋dm5 镜像网址",
        "value": "https://www.dm5.com",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
