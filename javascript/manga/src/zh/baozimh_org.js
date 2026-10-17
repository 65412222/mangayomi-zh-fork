const mangayomiSources = [{
  "name": "包子漫画org",
  "lang": "zh",
  "baseUrl": "https://baozimh.org",
  "apiUrl": "https://v2.apikk.top/api/v2",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://baozimh.org",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.3",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/baozimh_org.js"
}];

// 章节图片解码器：移植自 venera-configs goda.js（上游注明移植自 keiyoushi PR #16898）
// getinfo 返回 images.images 为混淆字符串：去 J7r/nQ -> 按 kD/W4s 切三段 -> 段3+段1+段2
// -> 每隔一个 7 字符块反转 -> 自定义字母表映射回标准 base64url -> base64 解码 -> JSON
const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CUSTOM = "_-9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function decodeChapterImages(input) {
  const PRE = "J7r", M1 = "kD", M2 = "W4s", SUF = "nQ", GROUP = 7;
  if (typeof input !== "string" || !input.startsWith(PRE) || !input.endsWith(SUF)) {
    throw new Error("包子org: 未知章节数据格式");
  }
  const TABLE = new Array(128).fill(-1);
  for (let i = 0; i < CUSTOM.length; i++) TABLE[CUSTOM.charCodeAt(i)] = STD.charCodeAt(i);
  const body = input.substring(PRE.length, input.length - SUF.length);
  const payloadLen = body.length - M1.length - M2.length;
  const aLen = Math.floor(payloadLen / 3);
  const bLen = Math.floor((payloadLen - aLen) / 2);
  const cLen = payloadLen - aLen - bLen;
  const part1 = body.substring(0, bLen);
  const marker1 = body.substring(bLen, bLen + M1.length);
  const part2 = body.substring(bLen + M1.length, bLen + M1.length + cLen);
  const marker2 = body.substring(bLen + M1.length + cLen, bLen + M1.length + cLen + M2.length);
  const part3 = body.substring(bLen + M1.length + cLen + M2.length);
  if (marker1 !== M1 || marker2 !== M2 || part3.length !== aLen) {
    throw new Error("包子org: 未知章节数据格式(marker)");
  }
  const reordered = part3 + part1 + part2;
  let unzig = "";
  for (let i = 0, block = 0; i < reordered.length; i += GROUP, block++) {
    const chunk = reordered.substring(i, Math.min(i + GROUP, reordered.length));
    unzig += (block % 2 === 1) ? chunk.split("").reverse().join("") : chunk;
  }
  let standard = "";
  for (let i = 0; i < unzig.length; i++) {
    const code = unzig.charCodeAt(i);
    const mapped = code < 128 ? TABLE[code] : -1;
    if (mapped < 0) throw new Error("包子org: 无效章节数据字符");
    standard += String.fromCharCode(mapped);
  }
  const b64 = standard.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeBase64(b64);
  return JSON.parse(json);
}

function decodeBase64(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  str = str.replace(/=+$/, "");
  let result = "";
  let i = 0;
  while (i < str.length) {
    const e1 = chars.indexOf(str.charAt(i));
    const e2 = chars.indexOf(str.charAt(i + 1));
    const ch3 = str.charAt(i + 2);
    const ch4 = str.charAt(i + 3);
    const e3 = ch3 ? chars.indexOf(ch3) : -1;
    const e4 = ch4 ? chars.indexOf(ch4) : -1;
    if (e1 < 0 || e2 < 0) throw new Error("包子org: base64 非法字符");
    result += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 >= 0) result += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
    if (e4 >= 0) result += String.fromCharCode(((e3 & 3) << 6) | e4);
    i += 4;
  }
  return result;
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
  apiURL() { return this.source.apiUrl; }
  // 图片线路映射：照抄站方 getChapter.js
  // x={c:{2:"https://c-nd2-1.6wm.top",default:"https://c-nd3-1.6wm.top"},
  //    t:{2:"https://t-nd2-1.6wm.top",default:"https://t-nd3-1.6wm.top"}}
  // $(line,route)=line===2?route[2]:route.default，默认 route=c
  // images.line 由 getinfo 返回（如海之边境 line=2，走 c-nd2-1）
  imgBase(line) {
    var routes = {
      c: { "2": "https://c-nd2-1.6wm.top", "default": "https://c-nd3-1.6wm.top" },
      t: { "2": "https://t-nd2-1.6wm.top", "default": "https://t-nd3-1.6wm.top" }
    };
    var r = routes.c;
    return (line === 2 || line === "2") ? r["2"] : r["default"];
  }

  headers(referer) {
    // CF 通修：像浏览器，不手写 Cookie/UA 覆盖（kashrtx 修法）
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }
  apiHeaders() {
    return {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Referer": this.baseURL() + "/"
    };
  }
  isChallenge(status, body) {
    if (status !== 403 && status !== 503) return false;
    if (!body) return false;
    const b = body.toLowerCase();
    return b.indexOf("challenge-form") !== -1 || b.indexOf("cf-turnstile") !== -1 ||
      b.indexOf("challenges.cloudflare.com") !== -1 || b.indexOf("cdn-cgi/challenge-platform") !== -1 ||
      (b.indexOf("just a moment") !== -1 && b.indexOf("enable javascript") !== -1) ||
      b.indexOf("__gatekeeper_challenge") !== -1 || b.indexOf("attention required") !== -1;
  }

  cardList(doc) {
    const items = [];
    for (const card of doc.select("div.pb-2")) {
      const a = card.selectFirst("a");
      if (!a) continue;
      const href = a.getHref;
      if (!href || href.indexOf("/manga/") !== 0) continue;
      // skip chapter links /manga/slug/xxx
      const parts = href.split("/").filter(Boolean);
      if (parts.length !== 2) continue;
      var name = "";
      try { name = card.selectFirst("h3.cardtitle").text.trim(); } catch (e) {}
      if (!name) continue;
      var img = "";
      try { img = card.selectFirst("img").attr("src") || ""; } catch (e) {}
      items.push({ name: name, imageUrl: img, link: href });
    }
    return items;
  }

  async getPopular(page) {
    const p = page || 1;
    // 实测 /manga-genre/hots SSR 只有 1 卡(其余 islands 懒加载)；搜索页 /s/海 SSR 30 卡
    // 热门走搜索通配：中文站搜常见字取榜单效果（别家无此站，无参考，只能实测）
    const queries = ["海", "王", "神", "魔", "仙"];
    const q = queries[(p - 1) % queries.length];
    const pg = Math.floor((p - 1) / queries.length) + 1;
    const url = this.baseURL() + "/s/" + encodeURIComponent(q) + "?page=" + pg;
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("包子org: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.cardList(doc);
    return { list: list, hasNextPage: list.length >= 18 };
  }

  async getLatestUpdates(page) {
    const p = page || 1;
    // /manga SSR 同样 islands 懒加载；走搜索页分页
    const url = this.baseURL() + "/s/" + encodeURIComponent("新") + "?page=" + p;
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("包子org: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.cardList(doc);
    return { list: list, hasNextPage: list.length >= 18 };
  }

  async search(query, page, filters) {
    const p = page || 1;
    const url = this.baseURL() + "/s/" + encodeURIComponent(query) + "?page=" + p;
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("包子org: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.cardList(doc);
    return { list: list, hasNextPage: list.length >= 18 };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers(this.baseURL() + "/"));
    const doc = new Document(res.body);
    var title = "";
    try { title = doc.selectFirst(".text-xl").text.trim().split("   ")[0].trim(); } catch (e) {}
    var cover = "";
    // 详情封面：img.object-cover（实测 class="object-cover rounded-md"，attr 在 Document 里按 object-cover 选）
    try {
      var cov = null;
      try { cov = doc.selectFirst("img.object-cover"); } catch (e) {}
      if (!cov) {
        try { cov = doc.selectFirst(".object-cover"); } catch (e) {}
      }
      cover = cov ? (cov.attr("src") || "") : "";
    } catch (e) {}
    var desc = "";
    try {
      const m = doc.selectFirst('meta[name="description"]');
      desc = m ? m.attr("content") : "";
    } catch (e) {}
    // 作者 + 分类（实测：作者：</span><a href="/manga-author/aiyou"；類型：</span><a href="/manga-genre/qita"；tag /manga-tag/）
    var author = "";
    try {
      const au = doc.selectFirst('a[href*="/manga-author/"]');
      author = au ? au.text.trim() : "";
    } catch (e) {}
    var genre = [];
    try {
      for (const g of doc.select('a[href*="/manga-genre/"], a[href*="/manga-tag/"]')) {
        const t = g.text.trim().replace(/^#/, "");
        if (t && genre.indexOf(t) === -1) genre.push(t);
      }
    } catch (e) {}
    var mid = "";
    try {
      const el = doc.selectFirst("#mangachapters");
      mid = el ? el.attr("data-mid") : "";
    } catch (e) {}
    if (!mid) {
      try {
        const el2 = doc.selectFirst("#chaplistlast");
        mid = el2 ? el2.attr("data-mid") : "";
      } catch (e) {}
    }
    if (!mid) throw new Error("包子org: 拿不到漫画ID");
    const apiRes = await new Client().get(
      this.apiURL() + "/manga/get?mid=" + mid + "&mode=all&t=" + Date.now(),
      this.apiHeaders()
    );
    const data = JSON.parse(apiRes.body);
    const chs = (data && data.data && data.data.chapters) || [];
    const chapters = [];
    for (const ch of chs) {
      if (ch && ch.id != null && ch.attributes && ch.attributes.title) {
        chapters.push({ name: ch.attributes.title, url: mid + "@" + ch.id });
      }
    }
    return {
      name: title,
      imageUrl: cover,
      description: desc,
      genre: genre,
      author: author,
      status: 2,
      chapters: chapters
    };
  }

  async getPageList(url) {
    // url format: mid@csid
    const parts = url.split("@");
    if (parts.length !== 2) throw new Error("包子org: 章节ID非法");
    const apiRes = await new Client().get(
      this.apiURL() + "/chapter/getinfo?m=" + parts[0] + "&c=" + parts[1],
      this.apiHeaders()
    );
    const json = JSON.parse(apiRes.body);
    const info = json && json.data && json.data.info;
    if (!info || !info.images) throw new Error("包子org: 章节图片数据为空");
    const raw = info.images.images !== undefined ? info.images.images : info.images;
    const line = info.images.line !== undefined ? info.images.line : 1;
    var list;
    if (typeof raw === "string") {
      list = decodeChapterImages(raw);
    } else if (Array.isArray(raw)) {
      list = raw;
    } else {
      throw new Error("包子org: 未知图片数据格式");
    }
    const base = this.imgBase(line);
    const out = [];
    for (const it of list) {
      if (it && it.url) out.push(base + it.url);
    }
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "包子org 镜像网址",
        "value": "https://baozimh.org",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
