const mangayomiSources = [{
  "name": "Anime1",
  "lang": "zh",
  "baseUrl": "https://anime1.me",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://anime1.me",
  "typeSource": "single",
  "itemType": 1,
  "isNsfw": false,
  "version": "0.0.5",
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

  headers(referer) {
    // CF 通修：像浏览器，不手写 Cookie/UA 覆盖
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
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

  // animelist.json row: [catId, title, status, year, season, extra]
  // A1(已验 10-19)：站方 og:image 与详情页均只给 sta.anicdn.com/logo/260x260.png 占位，无真实 poster，保持占位图
  async fetchList() {
    const res = await new Client().get(this.baseURL() + "/animelist.json", this.headers());
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("Anime1: 需 WebView 过验证后重试");
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
    const p = page || 1;
    // 别家(xptv/tvbox)走 /page/N?s= 分页；之前只拿第一页
    const res = await new Client().get(
      this.baseURL() + "/page/" + p + "?s=" + encodeURIComponent(query),
      this.headers()
    );
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("Anime1: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    const items = [];
    for (const art of doc.select("#main > article")) {
      // 搜索结果：标题取 entry-footer .cat-links a（系列名），别家 xptv 即此写法
      var a = null;
      try { a = art.selectFirst(".entry-footer .cat-links a"); } catch (e) {}
      if (!a) {
        try { a = art.selectFirst("h2.entry-title a"); } catch (e) {}
      }
      if (!a) continue;
      const href = a.getHref;
      const name = a.text.trim();
      if (!href || !name) continue;
      items.push({ name: name, imageUrl: "", link: href });
    }
    var hasNext = false;
    try {
      const np = doc.selectFirst(".nav-previous a, .navigation .nav-previous a");
      hasNext = !!np;
    } catch (e) {}
    // A2：搜出来是单集 article，同一系列多集重复，按系列链接去重（cat-links href 即系列代理，无 catId 时按名去重）
    const seenS = {};
    const uniqS = [];
    for (const it of items) {
      const k = it.link || it.name;
      if (!seenS[k]) { seenS[k] = 1; uniqS.push(it); }
    }
    return { list: uniqS, hasNextPage: hasNext };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers());
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("Anime1: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    // series page: /?cat=ID -> episode list (only #main > article scope,
    // page also contains recent-posts sidebar, must not mix in)
    if (url.indexOf("?cat=") != -1) {
      var title = "";
      try { title = doc.selectFirst("title").text.trim(); } catch (e) {}
      const eps = [];
      // 别家 tvbox：.site-main article + .video-js data-apireq 取单集签名
      for (const art of doc.select("#main > article, .site-main article")) {
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
      // 连载页分页：实测 ?cat=ID/page/N 回 404 空页，真分页是 &paged=N（游戏王 144：p1 107-94，paged=2 给 93-80，每页 14）
      // A3：guard 8→12，107 集需 8 页，173 集需 13 页，12 盖得住
      var pageN = 2;
      var sep = full.indexOf("?") !== -1 ? "&" : "?";
      var moreUrl = full + sep + "paged=" + pageN;
      var guard = 0;
      while (guard < 12) {
        guard++;
        var mres = null;
        try {
          mres = await new Client().get(moreUrl, this.headers(this.baseURL() + "/"));
        } catch (e) { break; }
        if (!mres || !mres.body) break;
        const mdoc = new Document(mres.body);
        const arts = mdoc.select("#main > article, .site-main article");
        var added = 0;
        for (const art of arts) {
          var aa = null;
          try { aa = art.selectFirst("h2.entry-title a"); } catch (e) {}
          if (!aa) continue;
          const href = aa.getHref;
          const name = aa.text.trim();
          if (!href || !name) continue;
          if (!href.match(/anime1\.me\/\d+\/?$/)) continue;
          if (!seen[href]) { seen[href] = 1; uniq.push({ name: name, url: href }); added++; }
        }
        if (!added) break;
        pageN++;
        moreUrl = full + sep + "paged=" + pageN;
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
    const res = await new Client().get(full, this.headers());
    if (this.isChallenge(res.statusCode || 200, res.body)) throw new Error("Anime1: 需 WebView 过验证后重试");
    const doc = new Document(res.body);
    // 别家 tvbox：单集页 .video-js data-apireq
    // A4：e/p/h 缺项时重取一次 apireq 再 POST，最多两轮
    var apiRes = null, data = null, src = "", lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      var pageBody = res.body, pageDoc = doc;
      if (attempt > 0) {
        try {
          const rr = await new Client().get(full, this.headers());
          if (rr && rr.body) { pageBody = rr.body; pageDoc = new Document(rr.body); }
        } catch (e) { break; }
      }
      var video = null;
      try { video = pageDoc.selectFirst(".video-js, video"); } catch (e) {}
      var apireq = video ? video.attr("data-apireq") : null;
      if (!apireq) {
        var m0 = pageBody.match(/data-apireq="([^"]+)"/);
        if (m0 && m0[1]) apireq = m0[1];
      }
      if (!apireq) { lastErr = new Error("Anime1: 找不到 data-apireq"); continue; }
      var payload = apireq;
      try { payload = decodeURIComponent(apireq); } catch (e) {}
      const apiUrl = "https://v.anime1.me/api";
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": full,
        "Origin": this.baseURL()
      };
      const client = new Client();
      try {
        apiRes = await client.post(apiUrl, headers, { d: payload });
        data = JSON.parse(apiRes.body);
      } catch (e) { lastErr = e; continue; }
      if (!data.s || !data.s.length || !data.s[0].src) { lastErr = new Error("Anime1: API 未返回播放地址"); continue; }
      src = data.s[0].src;
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = "https:" + src;
      lastErr = null;
      break;
    }
    if (lastErr) throw lastErr;
    // 别家 tvbox/xptv：播放要带 API 回的 e/p/h cookie，否则 403
    var videoHeaders = { "Referer": full };
    try {
      var rawCookie = "";
      if (apiRes.headers) {
        for (const k of Object.keys(apiRes.headers)) {
          if (k.toLowerCase() === "set-cookie") { rawCookie = apiRes.headers[k]; break; }
        }
      }
      if (!rawCookie && apiRes.allHeaders) rawCookie = apiRes.allHeaders;
      if (rawCookie) {
        const parts = String(rawCookie).split(/[,;]/);
        const keep = [];
        for (const p of parts) {
          const kv = p.trim().split("=");
          if (kv.length >= 2 && ["e", "p", "h"].indexOf(kv[0].trim()) !== -1) {
            keep.push(kv[0].trim() + "=" + kv.slice(1).join("=").trim());
          }
        }
        if (keep.length) videoHeaders["Cookie"] = keep.join("; ");
      }
    } catch (e) {}
    return [{ url: src, originalUrl: src, quality: data.s[0].type || "mp4", headers: videoHeaders }];
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
