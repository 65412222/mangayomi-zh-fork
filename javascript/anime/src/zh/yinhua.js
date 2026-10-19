const mangayomiSources = [{
  "name": "樱花动漫(新站)",
  "lang": "zh",
  "baseUrl": "https://www.yinhuadm.cc",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=https://www.yinhuadm.cc",
  "typeSource": "single",
  "itemType": 1,
  "isNsfw": false,
  "version": "0.0.2",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "anime/src/zh/yinhua.js"
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
    // 浏览器头，不手写 Cookie/UA 覆盖
    return {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Referer": referer || (this.baseURL() + "/"),
      "Upgrade-Insecure-Requests": "1"
    };
  }

  // ---- MD5 hex（key 推导用：md5(keystr+'lemon')，已对拍 node crypto：abc/空串/EXEwJkASpDlemon 全对） ----
  md5hex(string) {
    function rl(v, n) { return (v << n) | (v >>> (32 - n)); }
    function au(x, y) {
      var x8 = (x & 0x80000000), y8 = (y & 0x80000000);
      var x4 = (x & 0x40000000), y4 = (y & 0x40000000);
      var r = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
      if (x4 & y4) return (r ^ 0x80000000 ^ x8 ^ y8);
      if (x4 | y4) {
        if (r & 0x40000000) return (r ^ 0xC0000000 ^ x8 ^ y8);
        return (r ^ 0x40000000 ^ x8 ^ y8);
      }
      return (r ^ x8 ^ y8);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) { a = au(a, au(au(F(b, c, d), x), ac)); return au(rl(a, s), b); }
    function GG(a, b, c, d, x, s, ac) { a = au(a, au(au(G(b, c, d), x), ac)); return au(rl(a, s), b); }
    function HH(a, b, c, d, x, s, ac) { a = au(a, au(au(H(b, c, d), x), ac)); return au(rl(a, s), b); }
    function II(a, b, c, d, x, s, ac) { a = au(a, au(au(I(b, c, d), x), ac)); return au(rl(a, s), b); }
    function utf8(s) {
      s = s.replace(/\r\n/g, "\n");
      var t = "";
      for (var n = 0; n < s.length; n++) {
        var c = s.charCodeAt(n);
        if (c < 128) t += String.fromCharCode(c);
        else if (c < 2048) t += String.fromCharCode((c >> 6) | 192, (c & 63) | 128);
        else t += String.fromCharCode((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
      }
      return t;
    }
    function toWords(s) {
      var ml = s.length;
      var t1 = ml + 8, t2 = (t1 - (t1 % 64)) / 64, nw = (t2 + 1) * 16;
      var w = new Array(nw - 1), bp = 0, bc = 0, wc = 0;
      while (bc < ml) {
        wc = (bc - (bc % 4)) / 4; bp = (bc % 4) * 8;
        w[wc] = (w[wc] | (s.charCodeAt(bc) << bp)) | 0; bc++;
      }
      wc = (bc - (bc % 4)) / 4; bp = (bc % 4) * 8;
      w[wc] = (w[wc] | (0x80 << bp)) | 0;
      w[nw - 2] = ml << 3; w[nw - 1] = ml >>> 29;
      return w;
    }
    function toHex(v) {
      var h = "";
      for (var i = 0; i <= 3; i++) {
        var byte = (v >>> (i * 8)) & 255;
        var t = "0" + byte.toString(16);
        h += t.substr(t.length - 2, 2);
      }
      return h;
    }
    var x = toWords(utf8(string)), a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
    for (var k = 0; k < x.length; k += 16) {
      var A = a, B = b, C = c, D = d;
      a = FF(a, b, c, d, x[k+0], 7, 0xD76AA478); d = FF(d, a, b, c, x[k+1], 12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k+2], 17, 0x242070DB); b = FF(b, c, d, a, x[k+3], 22, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k+4], 7, 0xF57C0FAF); d = FF(d, a, b, c, x[k+5], 12, 0x4787C62A);
      c = FF(c, d, a, b, x[k+6], 17, 0xA8304613); b = FF(b, c, d, a, x[k+7], 22, 0xFD469501);
      a = FF(a, b, c, d, x[k+8], 7, 0x698098D8); d = FF(d, a, b, c, x[k+9], 12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k+10], 17, 0xFFFF5BB1); b = FF(b, c, d, a, x[k+11], 22, 0x895CD7BE);
      a = FF(a, b, c, d, x[k+12], 7, 0x6B901122); d = FF(d, a, b, c, x[k+13], 12, 0xFD987193);
      c = FF(c, d, a, b, x[k+14], 17, 0xA679438E); b = FF(b, c, d, a, x[k+15], 22, 0x49B40821);
      a = GG(a, b, c, d, x[k+1], 5, 0xF61E2562); d = GG(d, a, b, c, x[k+6], 9, 0xC040B340);
      c = GG(c, d, a, b, x[k+11], 14, 0x265E5A51); b = GG(b, c, d, a, x[k+0], 20, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k+5], 5, 0xD62F105D); d = GG(d, a, b, c, x[k+10], 9, 0x2441453);
      c = GG(c, d, a, b, x[k+15], 14, 0xD8A1E681); b = GG(b, c, d, a, x[k+4], 20, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k+9], 5, 0x21E1CDE6); d = GG(d, a, b, c, x[k+14], 9, 0xC33707D6);
      c = GG(c, d, a, b, x[k+3], 14, 0xF4D50D87); b = GG(b, c, d, a, x[k+8], 20, 0x455A14ED);
      a = GG(a, b, c, d, x[k+13], 5, 0xA9E3E905); d = GG(d, a, b, c, x[k+2], 9, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k+7], 14, 0x676F02D9); b = GG(b, c, d, a, x[k+12], 20, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k+5], 4, 0xFFFA3942); d = HH(d, a, b, c, x[k+8], 11, 0x8771F681);
      c = HH(c, d, a, b, x[k+11], 16, 0x6D9D6122); b = HH(b, c, d, a, x[k+14], 23, 0xFDE5380C);
      a = HH(a, b, c, d, x[k+1], 4, 0xA4BEEA44); d = HH(d, a, b, c, x[k+4], 11, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k+7], 16, 0xF6BB4B60); b = HH(b, c, d, a, x[k+10], 23, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k+13], 4, 0x289B7EC6); d = HH(d, a, b, c, x[k+0], 11, 0xEAA127FA);
      c = HH(c, d, a, b, x[k+3], 16, 0xD4EF3085); b = HH(b, c, d, a, x[k+6], 23, 0x4881D05);
      a = HH(a, b, c, d, x[k+9], 4, 0xD9D4D039); d = HH(d, a, b, c, x[k+12], 11, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k+15], 16, 0x1FA27CF8); b = HH(b, c, d, a, x[k+2], 23, 0xC4AC5665);
      a = II(a, b, c, d, x[k+0], 6, 0xF4292244); d = II(d, a, b, c, x[k+7], 10, 0x432AFF97);
      c = II(c, d, a, b, x[k+14], 15, 0xAB9423A7); b = II(b, c, d, a, x[k+5], 21, 0xFC93A039);
      a = II(a, b, c, d, x[k+12], 6, 0x655B59C3); d = II(d, a, b, c, x[k+3], 10, 0x8F0CCC92);
      c = II(c, d, a, b, x[k+10], 15, 0xFFEFF47D); b = II(b, c, d, a, x[k+1], 21, 0x85845DD1);
      a = II(a, b, c, d, x[k+8], 6, 0x6FA87E4F); d = II(d, a, b, c, x[k+15], 10, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k+6], 15, 0xA3014314); b = II(b, c, d, a, x[k+13], 21, 0x4E0811A1);
      a = II(a, b, c, d, x[k+4], 6, 0xF7537E82); d = II(d, a, b, c, x[k+11], 10, 0xBD3AF235);
      c = II(c, d, a, b, x[k+2], 15, 0x2AD7D2BB); b = II(b, c, d, a, x[k+9], 21, 0xEB86D391);
      a = au(a, A); b = au(b, B); c = au(c, C); d = au(d, D);
    }
    return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
  }

  cardList(body) {
    // 卡片是"海报anchor + 标题anchor"两个同 link 的 <a>：海报链带图+alt 名，标题链带 <strong> 名
    // 按 link 合并，图/名互补
    const byLink = {};
    const order = [];
    const parts = body.split('<a href="/v/');
    for (var i = 1; i < parts.length; i++) {
      const chunk = parts[i].substring(0, 2500);
      const hm = chunk.match(/^(\d+)\.html"/);
      if (!hm) continue;
      const link = "/v/" + hm[1] + ".html";
      var name = "";
      var tm = chunk.match(/title="([^"]{1,60})"/);
      if (tm) name = tm[1];
      if (!name) {
        var sm = chunk.match(/<strong>([^<]{1,60})<\/strong>/);
        if (sm) name = sm[1];
      }
      if (!name) {
        var pm = chunk.match(/module-poster-item-title">([^<]{1,60})</);
        if (pm) name = pm[1];
      }
      if (!name) {
        var am = chunk.match(/alt="([^"]{1,60})"/);
        if (am && am[1].indexOf("http") !== 0 && am[1].indexOf(".gif") === -1) name = am[1];
      }
      name = (name || "").trim();
      var img = "";
      var im = chunk.match(/data-original="(https?:\/\/[^"]{10,200})"/);
      if (im) img = im[1];
      if (!byLink[link]) { byLink[link] = { name: "", imageUrl: "", link: link }; order.push(link); }
      if (name && !byLink[link].name) byLink[link].name = name;
      if (img && !byLink[link].imageUrl) byLink[link].imageUrl = img;
    }
    const items = [];
    for (const k of order) { if (byLink[k].name) items.push(byLink[k]); }
    return items;
  }

  async getPopular(page) {
    if (page > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/label/hot.html", this.headers());
    return { list: this.cardList(res.body), hasNextPage: false };
  }

  async getLatestUpdates(page) {
    if (page > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(this.baseURL() + "/label/new.html", this.headers());
    return { list: this.cardList(res.body), hasNextPage: false };
  }

  async search(query, page, filters) {
    // 站内搜索无真翻页（page2 回空壳），只取第 1 页
    if (page > 1) return { list: [], hasNextPage: false };
    const res = await new Client().get(
      this.baseURL() + "/vch/" + encodeURIComponent(query) + ".html",
      this.headers()
    );
    return { list: this.cardList(res.body), hasNextPage: false };
  }

  async getDetail(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers(full));
    const body = res.body;
    var title = "";
    var hm = body.match(/module-info-heading"><h1>([^<]{1,80})<\/h1>/);
    if (hm) title = hm[1].trim();
    if (!title) {
      var tm = body.match(/<title>([^<]{1,80})/);
      if (tm) title = tm[1].split("-")[0].trim();
    }
    var cover = "";
    var pi = body.indexOf("module-info-poster");
    if (pi !== -1) {
      var cm = body.substring(pi, pi + 1200).match(/data-original="(https?:\/\/[^"]{10,200})"/);
      if (cm) cover = cm[1];
    }
    var desc = "";
    var dm = body.match(/module-info-introduction-content"><p>([\s\S]{1,2000}?)<\/p>/);
    if (dm) desc = dm[1].replace(/<[^>]+>/g, "").trim();
    // 线路：tab 顺序 Laoz/Bfeng/Diff；sid 为线路全局编号（实测 Bfeng=1/Laoz=2/Diff=3），tab 名直接用
    // Y1：Diff 线老集存活率最高，eps 按 Diff 优先排，App 点第一个就是活的
    var tabs = [];
    var tabRe = /data-dropdown-value="([^"]+)"/g, tmg;
    while ((tmg = tabRe.exec(body)) !== null) tabs.push(tmg[1]);
    const regions = body.split("module-list sort-list");
    const eps = [];
    for (var r = 1; r < regions.length && r <= tabs.length; r++) {
      const line = tabs[r - 1];
      const region = regions[r].substring(0, 300000);
      var epRe = /<a class="module-play-list-link" href="(\/p\/\d+-\d+-\d+\.html)"[^>]*title="([^"]*)">\s*<span>([^<]{1,40})<\/span>/g, emg;
      while ((emg = epRe.exec(region)) !== null) {
        eps.push({ name: "[" + line + "] " + emg[3].trim(), url: emg[1] });
      }
    }
    // Y1+Y4：Diff 线老集存活率最高，Diff 优先排，App 点第一个就是活的
    eps.sort(function (a, b) {
      var pa = a.name.indexOf("[Diff]") === 0 ? 0 : 1;
      var pb = b.name.indexOf("[Diff]") === 0 ? 0 : 1;
      return pa - pb;
    });
    return { name: title, imageUrl: cover, description: desc, genre: [], episodes: eps };
  }

  async getVideoList(url) {
    const full = url.startsWith("http") ? url : this.baseURL() + url;
    const res = await new Client().get(full, this.headers(full));
    const body = res.body;
    var um = body.match(/"url":"(MCZY-[^"]{10,300})"/);
    if (!um) {
      // 非加密直链兜底
      var d0 = body.match(/"url":"((https?:)?\/\/[^"]{10,300})"/);
      if (d0 && d0[1].indexOf("http") !== -1) {
        var u0 = d0[1].replace(/\\\//g, "/");
        return [{ url: u0, originalUrl: u0, quality: "HLS", headers: { "Referer": full } }];
      }
      var fr = body.match(/<iframe[^>]+src="([^"]+)"/);
      if (fr && fr[1]) {
        var iu = fr[1];
        if (iu.startsWith("/")) iu = this.baseURL() + iu;
        return [{ url: iu, originalUrl: iu, quality: "iframe" }];
      }
      throw new Error("樱花动漫: 未找到播放地址");
    }
    var from = "HLS";
    var fm = body.match(/"from":"([^"]+)"/);
    if (fm) from = fm[1];
    const mcue = "https://player.mcue.cc/yinhua/?url=" + um[1];
    const ires = await new Client().get(mcue, this.headers(full));
    const ibody = ires.body;
    // decrypt key：两 meta now_ id 去前缀后按 id 字符排序拼 text + 'lemon' 取 md5
    var ids = [];
    var idRe = /id="(now_[A-Za-z0-9]+)"/g, img2;
    while ((img2 = idRe.exec(ibody)) !== null) ids.push(img2[1]);
    var cfgm = ibody.match(/"url":\s*"([A-Za-z0-9+/=]{20,400})"/);
    // Y4：短 cfg（最新一集站方没 scrap）不会命中上面 20 位下限，直接走下面透传，不当解密 bug 修
    if (ids.length >= 2 && cfgm) {
      try {
        const v1 = ids[1].substring(4), v2 = ids[0].substring(4);
        const arr = [];
        for (var k = 0; k < v2.length && k < v1.length; k++) arr.push({ id: v2[k], text: v1[k] });
        arr.sort(function (x, y) { return x.id < y.id ? -1 : (x.id > y.id ? 1 : 0); });
        var keystr = "";
        for (const o of arr) keystr += o.text;
        const md5 = this.md5hex(keystr + "lemon");
        const aesKey = md5.substring(16), iv = md5.substring(0, 16);
        const plain = cryptoHandler(cfgm[1], iv, aesKey, false);
        if (plain && plain.indexOf("http") === 0) {
          // Y2+Y4：直链 + iframe 双源返回，老集 404 时 App 内可手动顺延；短 cfg 解空走下面透传
          return [
            { url: plain, originalUrl: plain, quality: from + " HLS", headers: { "Referer": "https://player.mcue.cc/" } },
            { url: mcue, originalUrl: mcue, quality: "iframe" }
          ];
        }
      } catch (e) {}
    }
    // 解密失败则透传 iframe，由 App 内 WebView 播
    return [{ url: mcue, originalUrl: mcue, quality: "iframe" }];
  }

  getFilterList() { return []; }

  getSourcePreferences() {
    return [{
      "key": "domain_url",
      "listPreference": {
        "title": "Website Url",
        "summary": "樱花动漫镜像切换",
        "valueIndex": 0,
        "entries": ["yinhuadm.cc", "yinhuadm.net", "yinhuadm.xyz"],
        "entryValues": ["https://www.yinhuadm.cc", "https://www.yinhuadm.net", "https://www.yinhuadm.xyz"]
      }
    }];
  }
}
