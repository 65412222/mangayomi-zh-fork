const mangayomiSources = [{
  "name": "再漫画",
  "lang": "zh",
  "baseUrl": "https://manhua.zaimanhua.com",
  "apiUrl": "https://v4api.zaimanhua.com/app/v1",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://manhua.zaimanhua.com",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/zaimanhua.js"
}];

class DefaultExtension extends MProvider {
  apiURL() { return this.source.apiUrl; }
  apiHeaders() {
    return {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "User-Agent": "Mozilla/5.0 (Linux; Android) Mobile",
      "Referer": "https://manhua.zaimanhua.com/"
    };
  }

  // search/update/rank 条目：comic_id 与 id 其中一个为 0，取非零者
  resolveId(c) {
    var ids = [c.comic_id, c.id, c.comicId];
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] && ids[i] !== 0 && ids[i] !== "0") return String(ids[i]);
    }
    return "";
  }

  parseItem(c) {
    var tags = [];
    try {
      var ts = (c.types || "").split(/[,/、]/);
      for (var t of ts) { t = t.trim(); if (t) tags.push(t); }
    } catch (e) {}
    return {
      name: c.title || c.name || "",
      imageUrl: c.cover || "",
      link: this.resolveId(c)
    };
  }

  async getPopular(page) {
    const p = page || 1;
    // filter sortType=2 人气排序（实测返回 data.comicList + totalNum）
    const url = this.apiURL() + "/comic/filter/list?status=0&theme=0&zone=0&cate=0&sortType=2&page=" + p + "&size=20";
    const res = await new Client().get(url, this.apiHeaders());
    const data = JSON.parse(res.body).data || {};
    const raw = data.comicList || [];
    const list = [];
    for (const c of raw) {
      const it = this.parseItem(c);
      if (it.name && it.link) list.push(it);
    }
    const total = data.totalNum || 0;
    return { list: list, hasNextPage: total ? p * 20 < total : list.length >= 20 };
  }

  async getLatestUpdates(page) {
    const p = page || 1;
    // 更新列表（实测返回 data 数组，条目含 comic_id/title/cover/authors/status/types）
    const url = this.apiURL() + "/comic/update/list/0/" + p;
    const res = await new Client().get(url, this.apiHeaders());
    const raw = JSON.parse(res.body).data || [];
    const list = [];
    for (const c of raw) {
      const it = this.parseItem(c);
      if (it.name && it.link) list.push(it);
    }
    return { list: list, hasNextPage: list.length >= 20 };
  }

  async search(query, page, filters) {
    const p = page || 1;
    // 实测：必须带 sort=0；中文单字可搜（恋->2205），海贼王类版权词零结果属站方行为
    const url = this.apiURL() + "/search/index?keyword=" + encodeURIComponent(query) +
      "&page=" + p + "&sort=0&size=20";
    const res = await new Client().get(url, this.apiHeaders());
    const raw = (JSON.parse(res.body).data || {}).list || [];
    const list = [];
    for (const c of raw) {
      const it = this.parseItem(c);
      if (it.name && it.link) list.push(it);
    }
    return { list: list, hasNextPage: list.length >= 20 };
  }

  async getDetail(url) {
    const id = url.startsWith("http") ? (url.match(/(\d+)/) || [])[1] : url.split("@")[0];
    if (!id) throw new Error("再漫画: 漫画ID非法");
    const res = await new Client().get(
      this.apiURL() + "/comic/detail/" + id + "?channel=android", this.apiHeaders());
    const top = (JSON.parse(res.body) || {}).data || {};
    const d = top.data || top;
    if (!d || !d.title) throw new Error("再漫画: 详情为空");
    var genre = [];
    try {
      for (const t of (d.types || [])) {
        if (t && t.tag_name && genre.indexOf(t.tag_name) === -1) genre.push(t.tag_name);
      }
    } catch (e) {}
    var author = "";
    try {
      author = (d.authors || []).map(function (a) { return a.tag_name; }).filter(Boolean).join("/");
    } catch (e) {}
    var status = 0;
    try {
      const s = ((d.status || [])[0] || {}).tag_name || "";
      if (s.indexOf("完结") !== -1) status = 2;
      else if (s.indexOf("连载") !== -1) status = 1;
    } catch (e) {}
    const groups = d.chapters || [];
    const chapters = [];
    for (const g of groups) {
      const gt = g.title || "";
      for (const ch of (g.data || [])) {
        if (ch == null || ch.chapter_id == null) continue;
        const cn = ch.chapter_name || ch.chapter_title || String(ch.chapter_id);
        chapters.push({
          name: (groups.length > 1 && gt ? gt + " " : "") + cn,
          url: id + "@" + ch.chapter_id
        });
      }
    }
    return {
      name: d.title || "",
      imageUrl: d.cover || "",
      description: d.description || "",
      genre: genre,
      author: author,
      status: status,
      chapters: chapters
    };
  }

  async getPageList(url) {
    // url format: comicId@chapterId
    const parts = url.split("@");
    if (parts.length !== 2) throw new Error("再漫画: 章节ID非法");
    const res = await new Client().get(
      this.apiURL() + "/comic/chapter/" + parts[0] + "/" + parts[1] + "?channel=android",
      this.apiHeaders());
    const data = (((JSON.parse(res.body) || {}).data) || {}).data || {};
    const imgs = data.page_url_hd || data.page_url || [];
    if (!imgs.length) throw new Error("再漫画: 取图为空（可能付费章节）");
    return imgs;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "再漫画镜像网址（仅 Referer 用，API 固定 v4api）",
        "value": "https://manhua.zaimanhua.com",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
