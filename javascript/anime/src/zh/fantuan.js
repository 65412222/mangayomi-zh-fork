const mangayomiSources = [{
  "name": "饭团动漫",
  "lang": "zh",
  "baseUrl": "https://acgfta.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://acgfta.com",
  "typeSource": "single",
  "itemType": 1,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "anime/src/zh/fantuan.js"
}];

class DefaultExtension extends MProvider {
  baseURL() {
    const preference = new SharedPreferences();
    var base_url = preference.get("domain_url");
    if (!base_url) return this.source.baseUrl;
    if (base_url.endsWith("/")) base_url = base_url.slice(0, -1);
    return base_url;
  }

  getHeaders(url) {
    throw new Error("getHeaders not implemented");
  }

  cardList(doc) {
    const items = [];
    const cards = doc.select("div.col.anime-card");
    for (const card of cards) {
      const a = card.selectFirst("a.stretched-link");
      if (!a) continue;
      const href = a.getHref;
      const name = a.text.trim();
      if (!href || !name) continue;
      var img = "";
      try {
        const im = card.selectFirst("img.anime-cover");
        img = im.attr("data-src") || im.attr("src") || "";
        if (img && img.startsWith("/")) img = this.baseURL() + img;
      } catch (e) {}
      items.push({ name: name, imageUrl: img, link: href });
    }
    return items;
  }

  async getPopular(page) {
    if (page > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/ft/leaderboard.html", {
      "Referer": this.baseURL() + "/"
    });
    const doc = new Document(res.body);
    return { list: this.cardList(doc), hasNextPage: false };
  }

  async getLatestUpdates(page) {
    if (page > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/ft/recent.html", {
      "Referer": this.baseURL() + "/"
    });
    const doc = new Document(res.body);
    return { list: this.cardList(doc), hasNextPage: false };
  }

  async search(query, page, filters) {
    const res = await new Client().get(
      this.baseURL() + "/search.html?wd=" + encodeURIComponent(query),
      { "Referer": this.baseURL() + "/" }
    );
    const doc = new Document(res.body);
    return { list: this.cardList(doc), hasNextPage: false };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, {
      "Referer": this.baseURL() + "/"
    });
    const doc = new Document(res.body);
    var title = "";
    try { title = doc.selectFirst("div.detail-anime-title h6").text.trim(); } catch (e) {}
    if (!title) {
      try { title = doc.selectFirst("title").text.trim(); } catch (e) {}
    }
    var cover = "";
    try {
      const im = doc.selectFirst("img.anime-cover");
      cover = im.attr("data-src") || im.attr("src") || "";
      if (cover && cover.startsWith("/")) cover = this.baseURL() + cover;
    } catch (e) {}
    var desc = "";
    try { desc = doc.selectFirst("div.detail-anime-intro").text.trim(); } catch (e) {}
    try {
      const info = doc.select("div.detail-anime-info p").map(e => e.text.trim()).join(" | ");
      if (info) desc = info + "\n\n" + desc;
    } catch (e) {}
    const eps = [];
    for (const a of doc.select("a.btn-episode")) {
      const href = a.getHref;
      const name = a.text.trim();
      if (href && name) eps.push({ name: name, url: href });
    }
    return {
      name: title,
      imageUrl: cover,
      description: desc,
      genre: [],
      episodes: eps
    };
  }

  async getVideoList(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, {
      "Referer": this.baseURL() + "/"
    });
    const body = res.body;
    var m = body.match(/"url"\s*:\s*"(https:[^"]*?m3u8[^"]*)"/);
    if (m && m[1]) {
      const u = m[1].replace(/\\\//g, "/");
      return [{ url: u, originalUrl: u, quality: "HLS" }];
    }
    m = body.match(/(https:[^"'\\\s]*?\.m3u8[^"'\\\s]*)/);
    if (m && m[1]) {
      const u = m[1].replace(/\\\//g, "/");
      return [{ url: u, originalUrl: u, quality: "HLS" }];
    }
    m = body.match(/<iframe[^>]+src="([^"]+)"/);
    if (m && m[1]) {
      var iu = m[1];
      if (iu.startsWith("/")) iu = this.baseURL() + iu;
      return [{ url: iu, originalUrl: iu, quality: "iframe" }];
    }
    throw new Error("饭团: 未找到播放地址");
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "listPreference": {
        "title": "Website Url",
        "summary": "饭团动漫镜像切换",
        "valueIndex": 0,
        "entries": ["acgfta.com", "zzmplus.com", "fantuantv.com"],
        "entryValues": ["https://acgfta.com", "https://zzmplus.com", "https://fantuantv.com"]
      }
    }];
  }
}
