# Kazumi 规则适配手册

面向「站点还活着，但规则跑不通」的情况。上游 86 条规则里 68 条已 `deprecated`，剩下 18 条里仍有约 1/3 因改版、语法或选择器问题半失效——适配层就是把这部分捡回来。

结论先给：**4 类断点能靠改字段修好，3 类不能**。本轮修好 2 条（TvTFun、ezdmw），另有 2 条判定为站点侧死亡、1 条应为残缺规则。

## 1. 规则结构

一条规则是 JSON，两种采集模式可混用（搜索用 API、分集用 XPath 也合法）。

### XPath 模式

| 字段 | 含义 | 坑 |
|---|---|---|
| `baseURL` | 站点根 | 结尾带不带 `/` 都行，拼接时统一处理 |
| `searchURL` | 搜索页，`@keyword` 占位 | 中文必须 URL 编码 |
| `searchList` | 结果条目容器 | 静态层级（`//div[2]/div[8]/ul`）最容易在改版后命中导航栏 |
| `searchName` | 条目内标题 | 相对条目求值 |
| `searchResult` | 条目内链接 | 取 `@href` |
| `chapterRoads` | 详情页线路容器 | 每个容器当成一条线路 |
| `chapterResult` | 线路内分集链接 | 相对线路求值 |
| `roadName` | 线路名（可选） | 不填就是「线路1/2/3」 |

### API 模式

```json
"searchMode": "api",
"searchApiConfig": {
  "request": {"method": "GET", "url": "...", "query": {"keyword": "@keyword", "page": 1}},
  "listPath": "$.list[*]",
  "namePath": "$.name",
  "sourcePath": "$.id",
  "sourceTemplate": "https://site/detail/@source.html"
},
"chapterMode": "api",
"chapterApiConfig": {
  "request": {"method": "GET", "url": "...", "query": {"id": "@source"}},
  "format": "delimited",
  "roadNamesPath": "$.info.vod_play_from",
  "roadEpisodesPath": "$.info.vod_play_url",
  "roadSeparator": "$$$",
  "episodeSeparator": "#",
  "fieldSeparator": "$",
  "episodePage": {"url": "...", "query": {"url": "@episodeUrl"}}
}
```

`listPath` 各家不同：`.data.items[*]`、`.list[*]`、`.info.rows[*]` 都见过。**写诊断工具时不要把它写死**——我第一版写死成 `data.items`，直接让 3 条本来正常的规则显示「no-hits」。

## 2. 六类断点与修法

### ① 非标准属性选择器 `@class*=`（可修）

```diff
- "chapterRoads": "//ol[@class*='tvt-watch-episodes']"
+ "chapterRoads": "//ol[contains(@class,'tvt-watch-episodes')]"
```

`@class*=` 是 CSS 写法。作者自制的解析器可能认，标准 XPath 不认，导致任何标准工具都验不了。改用 `contains()` 两边都过。

### ② 并集里带前导斜杠 `/self::*[...]`（可修，但建议换思路）

```diff
- "chapterResult": "/self::*[@class='line_button_ban']/following-sibling::a[...] | /self::*[@class='line_button1']/..."
+ "chapterRoads": "//section[@class='anthology'][1]"
+ "chapterResult": "//a[@class='circuit_switch1']"
```

ezdmw 原规则想按线路切三组，但站点的 DOM 是「3 个标签 div + 39 个同级 a」，标签和集数不构成父子关系，`following-sibling::a` 会把三条线路的锚点全收进来（13×3）。与其硬拆，不如**只取主线**：13 集，干净可播，代价是丢掉备用线路。

一般原则：**站点把线路做成扁平兄弟节点时，别在 XPath 里做分组，退化成单线路**。

### ③ 静态层级命中导航栏（可修）

`//div[2]/div[2]/div[8]/div/div/ul` 这类按序号写的路径，改版后指到页头菜单很常见，表现是「有线路节点，但集数 0」。

修法：换成语义容器（`//ul[@class='anthology-list-play']`、`//ol[contains(@class,'episodes')]`），用工具里「按 `<a>` 数量排序的容器候选」挑。

### ④ 规则字段本身就残缺（不作适配）

`aafun` 的 `chapterRoads` 值是 `//`，`chapterResult` 为空——这不是失效，是没写完。同站点已有 `moonci` 可用，直接弃用。

### ⑤ 站点改版/搬家（不可适配）

`xfdmneo` 的 baseURL `dm1.xfdm.pro` 现在返回的是 18KB 的 Astro 落地页（只有「服务状态 / 漫画 / 游戏」三个入口，正文 4 个链接），动漫站迁到 `next.xifanacg.com`，而该域 API 返回 401。规则改不动，只能等上游重写。

### ⑥ 反爬 / JS 渲染（不可适配，只能 webview）

`AGE`（agedm.io）、`mutedm` 搜索页对 curl 一律 403；这些站点在 App 里靠 `useWebview: true` 走内嵌浏览器才出内容，规则本身没坏，但任何 HTTP 侧验证都会判死。**这类不要标 DEAD，标 NEEDS_WEBVIEW。**

## 3. 适配流程

```bash
# 1. 诊断：断在哪一步
python3 scripts/kazumi-diag.py kazumi-adapted TvTFun 来自深渊

# 2. 看「按 <a> 数量排序的容器候选」→ 挑语义容器改写 chapterRoads/chapterResult

# 3. 回归：三个样品分别跑一遍
python3 scripts/kazumi-verify.py kazumi-adapted 来自深渊 觉醒的神秘 脑洞学生会
```

判定标准（三条全过才算修好）：

1. 搜索拿到 ≥1 组 (标题, 链接)；
2. 详情页线路 ≥1，每条线路集数 ≥1；
3. 至少两个不同番剧都能出集数（防止「只对某个页面碰巧成立」）。

## 4. 工具局限（别把工具的失败当规则的失败）

| 局限 | 后果 |
|---|---|
| lxml 不支持 `@class*=`、位置型 XPath 语义与应用内解析器不同 | 会误报 0 集，先看容器候选再下结论 |
| `format: "delimited"` 的多线路字符串（`$$$` + `#` + `$`）本工具只做粗略切分 | giriGiri 这类会显示 `api-roads=0`，不代表 App 里不行 |
| 走 webview 的站点 HTTP 侧一定拿不到内容 | AGE / mutefun 只能标 NEEDS_WEBVIEW |
| 单 IP 单时段 | 晚高峰/多运营商结论需要重跑 |

## 5. 本轮适配结果

| 规则 | 原问题 | 改动 | 验证 |
|---|---|---|---|
| TvTFun | `@class*=` → 分集 0 | `contains(@class,'tvt-watch-episodes')` | 来自深渊 13 集 / 黄金乡 12 集 / 学生会也有洞 6 集 |
| ezdmw | 并集前导斜杠 → 分集 0 | 收成单线路主线 `circuit_switch1` | 来自深渊 13 集；剧场版 1 集 |
| xfdmneo | 站点变落地页 | 不适配 | 判定 DEAD（站迁 next.xifanacg.com，API 401） |
| aafun | `chapterRoads` = `//` | 不适用 | 判定残缺，用 moonci 替代 |
| sorani | 分集接口 404 | 未适配 | DEAD |

适配后的完整目录在 `kazumi-adapted/`（9 条），原样镜像在 `kazumi/`（7 条，与上游逐字节一致）。
