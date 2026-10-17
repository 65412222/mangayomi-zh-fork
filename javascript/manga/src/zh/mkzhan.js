const mangayomiSources = [{
  "name": "漫客栈",
  "lang": "zh",
  "baseUrl": "https://www.mkzhan.com",
  "apiUrl": "https://comic.mkzcdn.com",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://www.mkzhan.com",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/mkzhan.js"
}];

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

  headers(referer) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }
  apiHeaders() {
    return {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": this.baseURL() + "/",
      "X-Requested-With": "XMLHttpRequest"
    };
  }

  // 搜索页 / 榜单页 SSR 卡片：div.common-comic-item（封面 data-src 懒加载）
  cardList(doc) {
    const items = [];
    try {
      for (const card of doc.select("div.common-comic-item")) {
        var cid = "";
        try { cid = card.attr("data-cid") || ""; } catch (e) {}
        var name = "";
        try { name = card.selectFirst("p.comic__title").text.trim(); } catch (e) {}
        if (!name || !cid) continue;
        var img = "";
        try {
          const im = card.selectFirst("img");
          img = (im.attr("data-src") || im.attr("src") || "").split("!")[0].replace(/^http:/, "https:");
          if (img.indexOf("bg_loadimg") !== -1) img = "";
        } catch (e) {}
        items.push({ name: name, imageUrl: img, link: "/" + cid + "/" });
      }
    } catch (e) {}
    return items;
  }

  // 榜单页另一样式兜底：a[href=/数字/] + 文本名
  rankList(doc) {
    var list = this.cardList(doc);
    if (list.length) return list;
    const seen = {};
    try {
      for (const a of doc.select('a[href]')) {
        const href = a.getHref;
        if (!href || !href.match(/^\/\d+\/$/)) continue;
        var name = "";
        try { name = a.text.trim(); } catch (e) {}
        if (!name || name.length > 40) continue;
        if (!seen[href]) {
          seen[href] = 1;
          list.push({ name: name, imageUrl: "", link: href });
        }
      }
    } catch (e) {}
    return list;
  }

  async getPopular(page) {
    const p = page || 1;
    // /top/ SSR 榜单（实测 200，218 个漫画链）；无真分页，只给 p1
    if (p > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/top/", this.headers());
    const doc = new Document(res.body);
    const list = this.rankList(doc);
    return { list: list, hasNextPage: false };
  }

  async getLatestUpdates(page) {
    const p = page || 1;
    // /update/ 最新（实测 200）；无真分页，只给 p1
    if (p > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/update/", this.headers());
    const doc = new Document(res.body);
    const list = this.rankList(doc);
    return { list: list, hasNextPage: false };
  }

  async search(query, page, filters) {
    const p = page || 1;
    if (p > 1) return { list: [], hasNextPage: false };
    const url = this.baseURL() + "/search/?keyword=" + encodeURIComponent(query);
    const res = await new Client().get(url, this.headers());
    const doc = new Document(res.body);
    const list = this.cardList(doc);
    return { list: list, hasNextPage: false };
  }

  async getDetail(url) {
    const cid = (url.match(/\/(\d+)\/?/) || [])[1];
    if (!cid) throw new Error("漫客栈: 漫画ID非法");
    // 详情走 comic/info 接口（免登录，实测 code 200：title/cover/content/finish）
    const infoRes = await new Client().get(
      this.apiURL() + "/comic/info/?comic_id=" + cid, this.apiHeaders());
    const info = (JSON.parse(infoRes.body) || {}).data || {};
    if (!info || !info.title) throw new Error("漫客栈: 详情为空");
    // 目录走 chapter/v1 接口（免登录，实测回数组：chapter_id/title/is_vip）
    const chRes = await new Client().get(
      this.apiURL() + "/chapter/v1/?comic_id=" + cid, this.apiHeaders());
    const raw = (JSON.parse(chRes.body) || {}).data || [];
    const chapters = [];
    const arr = Array.isArray(raw) ? raw : [];
    for (const ch of arr) {
      if (ch == null || ch.chapter_id == null) continue;
      chapters.push({ name: ch.title || ("第" + ch.number + "话"), url: cid + "@" + ch.chapter_id });
    }
    var status = 0;
    try {
      if (String(info.finish) === "2" || String(info.status) === "2") status = 2;
      else if (info.chapter_title) status = 1;
    } catch (e) {}
    var cover = "";
    try { cover = (info.cover || "").replace(/^http:/, "https:"); } catch (e) {}
    return {
      name: info.title || "",
      imageUrl: cover,
      description: info.content || "",
      genre: [],
      author: "",
      status: status,
      chapters: chapters
    };
  }

  async getPageList(url) {
    // url format: comicId@chapterId
    const parts = url.split("@");
    if (parts.length !== 2) throw new Error("漫客栈: 章节ID非法");
    // 旧版 chapter/content 免登录直接回图（新版 v1 要登录 302）；实测 data[].image
    const res = await new Client().get(
      this.apiURL() + "/chapter/content/?comic_id=" + parts[0] + "&chapter_id=" + parts[1],
      this.apiHeaders());
    const data = (JSON.parse(res.body) || {}).data || [];
    const out = [];
    for (const pg of data) {
      if (pg && pg.image) out.push(String(pg.image).replace(/^http:/, "https:"));
    }
    if (!out.length) throw new Error("漫客栈: 取图为空（可能付费章节）");
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "漫客栈镜像网址（API 固定 comic.mkzcdn.com）",
        "value": "https://www.mkzhan.com",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
