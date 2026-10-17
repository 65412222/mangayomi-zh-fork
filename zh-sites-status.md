# 中文站重排（2026-10-16 curl实测，App内点播待验）

> 图例：LIVE=首页直连通 / WAF=403反爬App内可过 / DOWN=挂 / PROBE=超时待验

## 漫画SAFE中文 12站

| 站 | 状态 | 备注 |
|---|---|---|
| 拷贝漫画 mangacopy.com | LIVE | ✅ fork自建310000009 v0.0.26已推(raw 200)：App头明文全链路，热门/更新p1p2各16无重合/搜海贼16/海贼王400话/首话209图200；目录走group分页，取图contents直连 |
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
| 华为吧 huaweiba.live | DOWN | 2026-10-17复探：302跳ww38后超时000(较早前302恶化)，判DOWN |
| 蜜柑计划 mikanani.me | LIVE | 2026-10-17复探200 |
| 非凡资源 ffzy.tv | LIVE | ✅ 2026-10-17 API通：/api.php/provide/vod total 98613，detail直给m3u8(feifan/ffm3u8双线路) |
| 玩偶哥哥 wogg.one | LIVE | 2026-10-17复探200，App内点播待验 |
| 极速资源 jisuzy.com | LIVE | ✅ 2026-10-17 API通：total 113989，detail给vv.jisuzyv.com播放页(jsyun/jsm3u8双线路，App内需跟播放页取直链) |
| 360资源 360zy.com | LIVE | ✅ 2026-10-17 API通：total 73165，detail直给vod1.maowushi.com m3u8(play_from=360zy) |
| 樱花动漫 yinhuadm.cc/net/xyz | LIVE | ✅ 2026-10-17新域名复活(旧iyinghua.com已死000)：三镜同体96KB，搜/vch/词.html→详情/v/数字.html→播放/p/5527-线路-集.html；海贼王1180集3线路；播放经player.mcue.cc+yinhua iframe内AES解密出m3u8；✅ fork自建310000003 v0.0.1已推(raw 200)：热门36/最新42/搜海贼16/详情3540集3线路Laoz-Bfeng-Diff/解密直出活m3u8(Diff线ffm3u8，App内点播待验) |
| 小米UC mucpan.cc | DOWN | 2026-10-17终探：www.mucpan.cc与mucpan.com均000，无新地址，归档 |
| 天空资源 tiankongzy.com | DOWN | 2026-10-17终探：.com/.net均000；tiankongzy.cc活着但跳urldance域名停靠页，判死，归档 |
| 至臻视觉 mihdr.top | DOWN | 2026-10-17终探：mihdr.top/.com均000，归档 |
| 多多影音 tv.yydsys.top | DOWN | 2026-10-17终探：tv.yydsys.top与yydsys.com均000，归档 |

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

LNReader manifest 2026-10-17实测305插件：中文7(69shu/ixdzs8/linovel/linovelib/linovelib_tw/novel543/quanben)，nsfw/adult字段筛选中0。结论：小说NSFW中文无现成插件位，要做需按站名单独写Mangayomi novel扩展或另找仓。本轮归档，不硬筛站名碰运气。

## 下一步（等你拍板）

1. 架子已在 workspace/mangayomi-zh-fork/，push到你GitHub就成可导入仓
2. 拷贝修头版扩展先写，0.0.25升0.0.26
3. 动画7活站App内点播验（你手机上做：蜜柑/非凡/极速/360/玩偶/樱花新站；华为吧已判DOWN跳过）
4. 樱花新站(yinhuadm.cc)写Mangayomi anime扩展：搜→详情→经mcue iframe decrypt取m3u8（setting.js是jsjiami混淆，decrypt需复刻DOM打乱+AES逻辑，或App内走WebView过）
5. 小米UC/天空/至臻/多多/华为吧已归档，不再追
