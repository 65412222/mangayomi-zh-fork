# Kazumi 番剧规则 国内可用性实测（2026-11-14）

> 对象：Kazumi（Predidit/Kazumi，Flutter 番剧采集 App）+ 官方规则仓 Predidit/KazumiRules。
> 目的：从 86 条上游规则里挑出**国内能直连、规则链路能跑通**的那几条，放进本仓 `kazumi/` 当自定义规则仓库。
> 图例：LIVE=直连通且跑通链路 / WAF=403 反爬（App 走 webview 可能能过，未证）/ DEAD=站点或规则失效 / PART=可用但不稳。

## 一句话结论

**上游 86 条规则里 68 条（79%）已被作者标 `deprecated`**，真正可选的是 18 条；这 18 条里跑通「搜索→详情→分集」且三轮复测全绿的有 **6 条**，加上 1 条两绿一红共 **7 条**入仓。

## 指标口径

| 维度 | 采集方式 | 判定 |
|---|---|---|
| 规则仓可达 | curl 拉 `index.json` / `*.json` | 200 且内容为合法 JSON |
| 站点可达 | curl 首页，浏览器头，12s 超时 | 200 且 body > 500B |
| 搜索链路 | 用规则 `searchURL` 搜样本番 `葬送的芙莉莲`，套 `searchList/searchName/searchResult` XPath 数条目 | 条目 ≥1 且能拿到标题+href |
| 分集链路 | 打开第一条结果详情页，套 `chapterRoads/chapterResult` | 线路 ≥1 且集数 ≥1 |
| API 模式 | 按 `searchApiConfig`/`chapterApiConfig` 拼真实请求，走 `listPath`/`roadEpisodesPath` | 条目 ≥1 且集数 ≥1 |
| 稳定性 | 同一链路连跑 3 轮，间隔 1.2s | 3/3 记 LIVE，2/3 记 PART |
| 加速价值 | 站点在国内直连的 P50 与抖动 | P50 ≤2s 且无超时 → 不必加速；抖动大/需代理 → 值得加速 |

> 说明：XPath 是用 Python + lxml 复刻，Kazumi 实际用的是 `xpath_selector_html_parser`，对**位置型选择器**（`//div[3]/...`）和 `@class*=` 这类非标准语法处理不同。凡命中这两类的规则，本表一律标「未判定」，不算通过也不算失败。

## 入仓规则（7 条）

| 规则 | 站点 | 规则版本 | 模式 | 搜索 | 分集 | 三轮 | P50 / 最大 | 判定 |
|---|---|---|---|---|---|---|---|---|
| MXdm | https://www.dcc3.com | 2.4 | xpath | 2 条 | 4 线路 / ≥40 集 | 3/3 | 1.57s / 1.80s | LIVE，直连够快，不必加速 |
| LMM | https://www.lmm22.com | 2.4 | api+xpath | 2 条 | 2 线路 / 48 集 | 3/3 | 1.70s / 1.71s | LIVE，稳，不必加速 |
| moonci | https://www.moonci.com | 1.1 | api+xpath | 2 条 | 3 线路 / 30 集 | 3/3 | 2.33s / 2.34s | LIVE |
| DM84 | https://dmbus.cc | 1.4 | xpath | 2 条 | 3 线路 / 30 集 | 3/3 | 1.68s / 5.57s | LIVE，峰值抖动大，值得加速 |
| akianime | https://www.akianime.cc | 1.4 | xpath | 2 条 | 3 线路 / 84 集 | 3/3 | 2.82s / 5.17s | LIVE，偏慢，值得加速 |
| dalvdm | https://www.sbdl.cc | 1.2 | api+xpath | 2 条 | ✅ | 3/3 | 2.61s / 3.59s | LIVE |
| giriGiriLove | https://ani.girigirilove.com | 2.7 | api | 2 条 | 1 线路 / 19 集 | 2/3 | 2.12s / 13.36s | PART，分集偶发失败+13s 尖峰，值得加速 |

## 未入仓及原因（11 条，均为上游未标 deprecated）

| 规则 | 站点 | 现象 | 归类 |
|---|---|---|---|
| AGE | https://www.agedm.io | 搜索页 curl 403（换桌面 UA 仍 403） | WAF：App 走 webview 可能可用，未证 |
| mutefun | https://www.mutedm.com | 搜索页 403 | WAF：同上 |
| xfdmneo | https://dm1.xfdm.pro | baseURL 已是 Astro 落地页（18KB，正文仅 3 个入口），动漫站迁至 next.xifanacg.com 且其 API 返回 401 | DEAD：站点迁移，规则不可适配 |
| TvTFun | https://www.tvtfun.net | `@class*=` 非标准语法致分集 0 | **已适配** → `kazumi-adapted/`（1.4） |
| sorani | https://www.sorani.net | 搜索 200，分集接口 404 | DEAD：上游规则过期 |
| 7sefun | https://www.7sefun.top | 搜索页仅 4.9KB 落地页，0 条目 | DEAD：站点换域名 |
| aafun | https://www.moonci.com | `chapterRoads` 字段只有 `//` | DEAD：规则本身残缺（同站建议用 moonci） |
| baimao | https://www.baimaodm.com | 搜索 2 条，详情页可用；`chapterRoads` 是静态位置路径 `//div[2]/div[2]/div[8]/div/div/ul` | **已入仓** → `kazumi-adapted/`（1.0，未改）：来自深渊 13 集 / 觉醒的神秘 11 集 / 学生会 6 集。选择器脆弱，改版即断 |
| ezdmw | https://m.ezdmw.org | 搜索 1 条（命中公告块），线路 4 但集数 0 | **已适配** → `kazumi-adapted/`（1.3） |
| mgnacg | https://www.mgnacg.com | 搜索 API 200，无 `sourceTemplate` 且耗 9.3s | PART |
| xfdmnext | https://next.xifanacg.com | 搜索 API 401 | WAF |

## 上游规则仓托管可达性（决定「导入要不要加速」）

| 通道 | 地址 | 2026-11-14 实测 |
|---|---|---|
| raw 直连（App 默认） | raw.githubusercontent.com/Predidit/KazumiRules/main/ | 000 失败 |
| ghProxy | gh-proxy.org 前缀 | 200 / 0.65s |
| gitcode 镜像 | raw.gitcode.com/gh_mirrors/ka/KazumiRules/raw/main/ | 200 / 0.26s |
| ghfast | ghfast.top 前缀 | 超时 |
| jsDelivr fastly | fastly.jsdelivr.net/gh/…@main/ | 200 / 0.69s |
| jsDelivr cdn | cdn.jsdelivr.net/gh/…@main/ | 000 失败 |

结论：**默认 direct 在国内基本不可用**，App 里必须切 gitcode 或 ghProxy；自建仓库则直接填 jsDelivr fastly / gh-proxy 前缀地址。

## 换样品复测：来自深渊 / 觉醒的神秘 / 脑洞学生会

第二轮把样品换成这三部，目的是看「同一批规则在长尾番上的覆盖率」，而不是只看链路通不通。命令：`python3 scripts/kazumi-verify.py kazumi-adapted 来自深渊 觉醒的神秘 脑洞学生会`。

| 规则 | 来自深渊（S1 13 集） | 觉醒的神秘 | 脑洞学生会 |
|---|---|---|---|
| DM84 | 13 集 × 6 线路（互镜像） | 无 | 学生会也有洞！6 集 × 3 线路 |
| TvTFun | 13 集 + 黄金乡 12 集 | 无 | 学生会也有洞！6 集 |
| akianime | 13 集 + 黄金乡 12 集 | 无 | 学生会也有洞！6 集 × 3 线路 |
| dalvdm | 13 集 × 3 线路 | 1 集 | 无 |
| ezdmw（适配后） | 13 集 | 无 | 无 |
| LMM | 第二季 13/12 集 | 无 | 无 |
| moonci | 黄金乡 12 集 | 条目在、0 集 | 无 |
| MXdm | 仅剧场版（1 集/部） | 无 | 无 |
| baimao（已入仓） | 13 集 × 6 线路 | **11 集** | 学生会也有洞！6 集（另有 CM 4 集） |
| giriGiri | 未判定（delimited 解析限制） | 无 | 未判定 |

三点读法：

1. **线路数 ≠ 集数**。DM84 的「6 线路 78 集」是 13 集 × 6 个镜像源，真实集数取「单线路最大值」。
2. **脑洞学生会 = 学生会也有洞！**，站点按正名收录，直接搜中文别名只有 AGE 命中。
3. **觉醒的神秘覆盖最差**：2026 年的剧场版，只有 baimao 有第 1 集、dalvdm 有 1 集，其余全无。新番/剧场版这类内容，规则数量帮不上忙。


## 第三轮：其余 9 条候选源全量复测

把 `kazumi/` 之外、表里还没定论的上游候选（9 条）用同一套脚本跑 3 个样品，结论是**只有 baimao 值得收**：

| 规则 | 搜索 | 详情/分集 | 判定 |
|---|---|---|---|
| baimao | ✅ | 13 集 × 6 线路 | **通过 → 入仓** |
| AGE | ✅ | 详情页空响应（JS 渲染） | NEEDS_WEBVIEW |
| mutefun | ❌ 无命中 | — | WAF 403 |
| 7sefun | ❌ 无命中 | — | DEAD（落地页） |
| aafun | ✅ | 线路 0（字段残缺 `//`） | DEAD（用 moonci） |
| mgnacg | ✅ | 线路 0 | PART：缺 `sourceTemplate` |
| sorani | ✅ API | `api-roads=0`（分集接口 404） | DEAD |
| xfdmneo | ❌ | — | DEAD（站点迁 next.xifanacg.com） |
| xfdmnext | ❌ 401 | — | WAF |

顺带修正两处旧结论：

1. **baimao 之前判「疑需 webview」是误判**。它的详情页能直接解析，之前 0 集是样品/超时问题，不是渲染问题。它的 `chapterRoads` 是静态位置路径，现在能跑但改版必断。
2. **moonci 对「觉醒的神秘」失效**：条目搜得到、线路 0，说明该条目详情页结构与常规番剧不同。同一条规则并非全站通吃。

## 复现

```bash
bash scripts/kazumi-probe.sh    # 站点级探针（首页+搜索页，写 kazumi-health.json）
python3 scripts/kazumi-index.py # 由 kazumi/*.json 重建 index.json
```

链路级（搜索→详情→分集）复刻脚本在本地 `cache/scratch/kz/`：`chain4.py`（xpath 规则）、`apitest.py`（api 规则）、`stability.py`（三轮复测）。

## 环境

- 网络：国内家宽，单线路，非加速环境；未做多运营商交叉。
- 时间：2026-11-14 单日单时段，未覆盖晚高峰。
- 客户端：本轮未在真机 Kazumi 内点播验证，链路结论来自 curl+lxml 复刻；标「未判定」的就是模拟器覆盖不到的部分。
