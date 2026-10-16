# 中文站重排（2026-10-16 curl实测，App内点播待验）

> 图例：LIVE=首页直连通 / WAF=403反爬App内可过 / DOWN=挂 / PROBE=超时待验

## 漫画SAFE中文 12站

| 站 | 状态 | 备注 |
|---|---|---|
| 拷贝漫画 mangacopy.com | LIVE | 首页200。API要带duoTuoCartoon UA+platform头，裸调error。扩展0.0.25待修头 |
| 漫画柜 manhuagui.com | WAF | 403，App内过 |
| 新新漫画 77mh.xyz | DOWN | 503 |
| 古风漫画 gufengmh.com | DOWN | 直连000 |
| 动漫之家 dmzj.com | DOWN | 直连000 |
| 漫画包子 baozimh.com | WAF | 403，m2k3a独家 |
| 如漫画 m.rumanhua1.com | LIVE | 200，m2k3a独家 |
| 包子镜像 cn.baozimh.com | WAF | 403 |
| MangaDex | LIVE | 200 |
| Comick | WAF | 403 |
| Webtoons | LIVE | 200 |
| Mihon补充 Keiyoushi中文76 | 见旧单 | SAFE45+NSFW31，Mihon侧用 |

## 小说SAFE中文 7站（LNReader）

| 站 | 状态 | 备注 |
|---|---|---|
| 爱下电子书 ixdzs8.com | LIVE | 200直连 |
| Quanben quanben.io | LIVE | 200直连 |
| 69书吧 69shu.xyz | WAF | 403 |
| linovel linovel.net | WAF | 403 |
| Linovelib bilinovel.com | WAF | 403 |
| Linovelib繁 tw.linovelib.com | WAF | 跳www后403 |
| Novel543 novel543.com | WAF | 403 |
| 轻小说 ZWolken 40源 | 半维护 | All包可导，轻国走Fusn126新API |

## 动画SAFE中文 11站（m2k3a）

| 站 | 状态 | 备注 |
|---|---|---|
| 华为吧 huaweiba.live | LIVE | 200 |
| 蜜柑计划 mikanani.me | LIVE | 200 |
| 非凡资源 ffzy.tv | LIVE | 200 |
| 玩偶哥哥 wogg.one | LIVE | 200 |
| 极速资源 jisuzy.com | LIVE | 200 |
| 360资源 360zy.com | LIVE | 200 |
| 樱花动漫 iyinghua.com | LIVE | http，200 |
| 小米UC mucpan.cc | DOWN? | 502，疑搬家待查 |
| 天空资源 tiankongzy.com | PROBE | 000超时 |
| 至臻视觉 mihdr.top | PROBE | 000超时 |
| 多多影音 tv.yydsys.top | PROBE | 000超时 |

## 动画NSFW中文 6站

| 站 | 状态 | 备注 |
|---|---|---|
| Hanime1 hanime1.me | WAF | 403 |
| Jable jable.tv | WAF | 403，中字漫改 |
| SupJav supjav.com | WAF | 403 |
| RouVideo rouvideo.com | WAF | 204 |
| MyReadingManga | WAF | 403 |
| Hanime hanime.tv | WAF | 403 |

## 漫画NSFW中文 31站（Keiyoushi旧单，待挑常用对位）

3Hentai / 6Manhua / Akuma / AsmHentai / Baka / BoyLove / Cartoon18 / H-Comic / Hanime1 / HANMAN18 / HDoujin / HentaiFox-Hand-Rox / Ikmmh / JComic / 禁漫天堂18comic.vip / Luscious / MangaXiaoSi / MyReadingManga / NH三件套 / NNHanman / PandaChaika / Picacomic哔咔 / PornPics / Roumanwu / SchaleNetwork / SimplyHentai / WNACG

## 小说NSFW中文

LNReader manifest无nsfw字段，待按站名硬筛。下轮做。

## 下一步（等你拍板）

1. 架子已在 workspace/mangayomi-zh-fork/，push到你GitHub就成可导入仓
2. 拷贝修头版扩展先写，0.0.25升0.0.26
3. 动画7活站App内点播验
4. 小米UC查搬家，天空/至臻/多多查新域名
