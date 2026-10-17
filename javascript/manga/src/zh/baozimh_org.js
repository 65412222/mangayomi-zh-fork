const mangayomiSources = [{
  "name": "包子漫画org",
  "lang": "zh",
  "baseUrl": "https://baozimh.org",
  "apiUrl": "https://v2.apikk.top/api/v2",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://baozimh.org",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
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
  imgBase() { return "https://c-nd3-1.6wm.top"; }

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
    const url = this.baseURL() + "/manga-genre/hots?page=" + page;
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("包子org: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.cardList(doc);
    return { list: list, hasNextPage: list.length >= 18 };
  }

  async getLatestUpdates(page) {
    const url = this.baseURL() + "/manga?page=" + page;
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
    try { cover = doc.selectFirst(".object-cover").attr("src") || ""; } catch (e) {}
    var desc = "";
    try {
      const m = doc.selectFirst('meta[name="description"]');
      desc = m ? m.attr("content") : "";
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
      genre: [],
      author: "",
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
    var list;
    if (typeof raw === "string") {
      list = decodeChapterImages(raw);
    } else if (Array.isArray(raw)) {
      list = raw;
    } else {
      throw new Error("包子org: 未知图片数据格式");
    }
    const base = this.imgBase();
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
