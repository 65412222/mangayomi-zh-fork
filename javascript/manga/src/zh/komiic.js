const mangayomiSources = [{
  "name": "Komiic",
  "lang": "zh",
  "baseUrl": "https://komiic.com",
  "apiUrl": "https://komiic.com/api/query",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://komiic.com",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.1",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/zh/komiic.js"
}];

// GraphQL 对齐 yuzono/tachiyomi-extensions komiic（Queries.kt/Entity.kt）+ venera komiic.js
// 匿名可查；图片未登录有每日配额（tachi 侧 402 即达上限），命中则提示登录
const COMIC_BODY = "{ id title description status imageUrl authors { id name } categories { id name } warnings }";

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
  gqlHeaders() {
    return {
      "Referer": this.baseURL() + "/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Content-Type": "application/json"
    };
  }
  imgHeaders(comicId, chapterId) {
    return {
      "Referer": this.baseURL() + "/comic/" + comicId + "/chapter/" + chapterId + "/images/all",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    };
  }

  async gql(op, varsObj, query) {
    const client = new Client();
    const res = await client.post(this.apiURL(), this.gqlHeaders(), {
      operationName: op,
      variables: varsObj,
      query: query
    });
    const json = JSON.parse(res.body);
    if (json.errors) throw new Error("Komiic: " + (json.errors[0] && json.errors[0].message ? json.errors[0].message : "query失败"));
    return json.data;
  }

  parseComic(c) {
    var author = "";
    try {
      author = (c.authors || []).map(function (a) { return a.name; }).filter(Boolean).join("，");
    } catch (e) {}
    var genre = [];
    try {
      for (const g of (c.categories || [])) {
        if (g && g.name && genre.indexOf(g.name) === -1) genre.push(g.name);
      }
      for (const w of (c.warnings || [])) {
        if (w && genre.indexOf(w) === -1) genre.push(w);
      }
    } catch (e) {}
    return { _c: c, name: c.title || "", imageUrl: c.imageUrl || "", link: "/comic/" + c.id, _author: author, _genre: genre };
  }
  toList(arr) {
    const list = [];
    for (const c of (arr || [])) {
      const it = this.parseComic(c);
      if (it.name && it.link) list.push({ name: it.name, imageUrl: it.imageUrl, link: it.link });
    }
    return list;
  }

  async listing(page, op) {
    const p = page || 1;
    const limit = 20;
    const data = await this.gql(op, {
      pagination: { limit: limit, offset: (p - 1) * limit, orderBy: op === "recentUpdate" ? "DATE_UPDATED" : "MONTH_VIEWS", status: "", asc: true }
    }, "query " + op + "($pagination: Pagination!) { comics: " + op + "(pagination: $pagination) " + COMIC_BODY + " }");
    const arr = data.comics || [];
    return { list: this.toList(arr), hasNextPage: arr.length >= limit };
  }

  async getPopular(page) {
    return await this.listing(page, "hotComics");
  }

  async getLatestUpdates(page) {
    return await this.listing(page, "recentUpdate");
  }

  async search(query, page, filters) {
    const p = page || 1;
    if (p > 1) return { list: [], hasNextPage: false };
    const data = await this.gql("searchComicsAndAuthors", { keyword: query },
      "query searchComicsAndAuthors($keyword: String!) { searchComicsAndAuthors(keyword: $keyword) { comics " + COMIC_BODY + " } }");
    const arr = ((data.searchComicsAndAuthors) || {}).comics || [];
    return { list: this.toList(arr), hasNextPage: false };
  }

  async getDetail(url) {
    const id = (url.match(/\/comic\/(\d+)/) || [])[1] || url.replace(/[^0-9]/g, "");
    if (!id) throw new Error("Komiic: 漫画ID非法");
    const data = await this.gql("mangaQuery", { comicId: id },
      "query mangaQuery($comicId: ID!) { comicById(comicId: $comicId) " + COMIC_BODY +
      " chaptersByComicId(comicId: $comicId) { id serial type size dateCreated } }");
    const info = data.comicById || {};
    if (!info || !info.title) throw new Error("Komiic: 详情为空");
    const raw = data.chaptersByComicId || [];
    // tachi 章节过滤默认 all；卷/话按 type 分组命名
    const books = [], chs = [];
    for (const c of raw) {
      if (!c || c.id == null) continue;
      if (c.type === "book") books.push(c); else chs.push(c);
    }
    const chapters = [];
    for (const c of books) chapters.push({ name: "第 " + c.serial + " 卷", url: id + "@" + c.id });
    for (const c of chs) chapters.push({ name: "第 " + c.serial + " 話", url: id + "@" + c.id });
    var status = 0;
    try {
      if (info.status === "ONGOING") status = 1;
      else if (info.status === "END") status = 2;
    } catch (e) {}
    const full = this.parseComic(info);
    return {
      name: info.title || "",
      imageUrl: info.imageUrl || "",
      description: info.description || "",
      genre: full._genre,
      author: full._author,
      status: status,
      chapters: chapters
    };
  }

  async getPageList(url) {
    // url format: comicId@chapterId
    const parts = url.split("@");
    if (parts.length !== 2) throw new Error("Komiic: 章节ID非法");
    const comicId = parts[0], chapterId = parts[1];
    var data;
    try {
      data = await this.gql("imagesByChapterId", { chapterId: chapterId },
        "query imagesByChapterId($chapterId: ID!) { imagesByChapterId(chapterId: $chapterId) { kid } }");
    } catch (e) {
      throw new Error("Komiic: 取图失败（" + e.message + "）");
    }
    const arr = data.imagesByChapterId || [];
    if (!arr.length) throw new Error("Komiic: 取图为空");
    const headers = this.imgHeaders(comicId, chapterId);
    const out = [];
    for (const im of arr) {
      if (im && im.kid) out.push({ url: this.baseURL() + "/api/image/" + im.kid, headers: headers });
    }
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "editTextPreference": {
        "title": "Url",
        "summary": "Komiic 镜像网址（默认 komiic.com，可切 h.komiic.com / komiic.cc）",
        "value": "https://komiic.com",
        "dialogTitle": "URL",
        "dialogMessage": ""
      }
    }];
  }
}
