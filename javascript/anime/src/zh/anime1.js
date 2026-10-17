const mangayomiSources = [{
  "name": "Anime1",
  "lang": "zh",
  "baseUrl": "https://anime1.me",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://anime1.me",
  "typeSource": "single",
  "itemType": 1,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "anime/src/zh/anime1.js"
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

  getHeaders(url) {
    throw new Error("getHeaders not implemented");
  }

  // animelist.json row: [catId, title, status, year, season, extra]
  async fetchList() {
    const res = await new Client().get(this.baseURL() + "/animelist.json", {
      "Referer": this.baseURL() + "/"
    });
    return JSON.parse(res.body);
  }

  async getPopular(page) {
    const list = await this.fetchList();
    const per = 20;
    const start = (page - 1) * per;
    const slice = list.slice(start, start + per);
    return {
      list: slice.map((e) => ({
        name: e[1] + (e[2] ? " " + e[2] : ""),
        imageUrl: "https://sta.anicdn.com/logo/260x260.png",
        link: "/?cat=" + e[0]
      })),
      hasNextPage: start + per < list.length
    };
  }

  async getLatestUpdates(page) {
    // animelist.json is ordered by latest update first
    return await this.getPopular(page);
  }

  async search(query, page, filters) {
    const res = await new Client().get(
      this.baseURL() + "/?s=" + encodeURIComponent(query),
      { "Referer": this.baseURL() + "/" }
    );
    const doc = new Document(res.body);
    const items = [];
    for (const art of doc.select("article")) {
      const a = art.selectFirst("h2.entry-title a");
      if (!a) continue;
      const href = a.getHref;
      const name = a.text.trim();
      if (!href || !name) continue;
      items.push({ name: name, imageUrl: "", link: href });
    }
    return { list: items, hasNextPage: false };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, {
      "Referer": this.baseURL() + "/"
    });
    const doc = new Document(res.body);
    // series page: /?cat=ID -> episode list (only <article> scope,
    // page also contains recent-posts sidebar, must not mix in)
    if (url.indexOf("?cat=") != -1) {
      var title = "";
      try { title = doc.selectFirst("title").text.trim(); } catch (e) {}
      const eps = [];
      for (const art of doc.select("article")) {
        const a = art.selectFirst("h2.entry-title a");
        if (!a) continue;
        const href = a.getHref;
        const name = a.text.trim();
        if (!href || !name) continue;
        if (!href.match(/anime1\.me\/\d+\/?$/)) continue;
        eps.push({ name: name, url: href });
      }
      // dedupe keep order
      const seen = {};
      const uniq = [];
      for (const e of eps) {
        if (!seen[e.url]) { seen[e.url] = 1; uniq.push(e); }
      }
      return {
        name: title.replace(" – Anime1.me 動畫線上看", "").replace(" &#8211; Anime1.me 動畫線上看", ""),
        imageUrl: "",
        description: "",
        genre: [],
        episodes: uniq
      };
    }
    // single episode page: one video
    var title = "";
    try { title = doc.selectFirst("title").text.trim(); } catch (e) {}
    return {
      name: title,
      imageUrl: "",
      description: "",
      genre: [],
      episodes: [{ name: title, url: full }]
    };
  }

  async getVideoList(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, {
      "Referer": this.baseURL() + "/"
    });
    const doc = new Document(res.body);
    const video = doc.selectFirst("video");
    if (!video) throw new Error("Anime1: 找不到 video 标签");
    var apireq = video.attr("data-apireq");
    if (!apireq) throw new Error("Anime1: 找不到 data-apireq");
    // data-apireq is urlencoded JSON; decode once for POST body
    var payload = apireq;
    try { payload = decodeURIComponent(apireq); } catch (e) {}
    const apiUrl = "https://v.anime1.me/api";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": full,
      "Origin": this.baseURL()
    };
    const client = new Client();
    const apiRes = await client.post(apiUrl, headers, { d: payload });
    const data = JSON.parse(apiRes.body);
    if (!data.s || !data.s.length || !data.s[0].src) {
      throw new Error("Anime1: API 未返回播放地址");
    }
    var src = data.s[0].src;
    if (src.startsWith("//")) src = "https:" + src;
    return [{ url: src, originalUrl: src, quality: data.s[0].type || "mp4" }];
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "Anime1 镜像网址",
        "value": "https://anime1.me",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
