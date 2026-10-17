const mangayomiSources = [{
  "name": "轻之国度",
  "lang": "zh",
  "baseUrl": "https://www.lightnovel.fun",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://www.lightnovel.fun",
  "typeSource": "single",
  "itemType": 2,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "novel/src/zh/lightnovel_fun.js"
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
  headers(referer) {
    // CF 通修：像浏览器，不手写 Cookie/UA 覆盖
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }
  isChallenge(status, body) {
    if (status !== 403 && status !== 503) return false;
    if (!body) return false;
    const b = body.toLowerCase();
    return b.indexOf("challenge-form") !== -1 || b.indexOf("cf-turnstile") !== -1 ||
      b.indexOf("challenges.cloudflare.com") !== -1 || b.indexOf("cdn-cgi/challenge-platform") !== -1 ||
      (b.indexOf("just a moment") !== -1 && b.indexOf("enable javascript") !== -1);
  }

  bookCards(doc) {
    const items = [];
    for (const card of doc.select("article.search-book-row, article.mini-book")) {
      try {
        const a = card.selectFirst('a[href^="/book/"]');
        if (!a) continue;
        const href = a.getHref;
        if (!href || !href.match(/^\/book\/\d+$/)) continue;
        var name = "";
        try {
          const h = card.selectFirst("h2, h3");
          if (h) name = h.text.trim();
        } catch (e) {}
        if (!name) continue;
        var img = "";
        try {
          const im = card.selectFirst("img");
          if (im) img = im.attr("src") || "";
        } catch (e) {}
        items.push({ name: name, imageUrl: img, link: href });
      } catch (e) {}
    }
    return items;
  }

  async getBooks(url) {
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("轻之国度: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.bookCards(doc);
    return { list: list, hasNextPage: false };
  }

  async getPopular(page) {
    // 首页好书推荐流
    return await this.getBooks(this.baseURL() + "/");
  }
  get supportsLatest() { return false; }
  async getLatestUpdates(page) {
    return { list: [], hasNextPage: false };
  }

  async search(query, page, filters) {
    const p = page || 1;
    const url = this.baseURL() + "/search?keyword=" + encodeURIComponent(query) + "&page=" + p;
    const res = await new Client().get(url, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("轻之国度: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const list = this.bookCards(doc);
    return { list: list, hasNextPage: false };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers(this.baseURL() + "/"));
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("轻之国度: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    var title = "";
    try { title = doc.selectFirst("h1").text.trim(); } catch (e) {}
    var cover = "";
    try {
      const m = doc.selectFirst('meta[property="og:image"]');
      if (m) cover = m.attr("content") || "";
    } catch (e) {}
    var author = "";
    try {
      const body = res.body;
      const am = body.match(/作者：<strong[^>]*>([^<]{1,40})<\/strong>/);
      if (am) author = am[1];
    } catch (e) {}
    const chapters = [];
    try {
      for (const a of doc.select("div.chapter-grid a.chapter")) {
        const href = a.getHref;
        var cname = "";
        try { cname = a.text.trim(); } catch (e) {}
        if (href && cname) chapters.push({ name: cname, url: href, scanlator: "" });
      }
    } catch (e) {}
    // 目录只有首卷 SSR 展开，其余卷懒加载；先返回已展开部分
    return {
      name: title,
      link: full,
      imageUrl: cover,
      description: "",
      author: author,
      genre: [],
      status: 2,
      chapters: chapters
    };
  }

  async getHtmlContent(name, url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers(this.baseURL() + "/"));
    if (res.statusCode !== 200) throw new Error("轻之国度: 章节加载失败 (" + res.statusCode + ")");
    const doc = new Document(res.body);
    // 正文 p.ln-paragraph（已验 4014 个 p）
    const ps = doc.select("p.ln-paragraph");
    if (!ps || ps.length === 0) throw new Error("轻之国度: 正文为空或被保护");
    var html = "";
    for (const p of ps) {
      try { html += p.outerHtml; } catch (e) {}
    }
    if (!html) throw new Error("轻之国度: 正文为空");
    return html;
  }
  async cleanHtmlContent(html) { return html; }

  getFilterList() { return []; }
  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "轻之国度镜像网址",
        "value": "https://www.lightnovel.fun",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
