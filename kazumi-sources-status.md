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
| xfdmneo | https://dm1.xfdm.pro | 选择器含位置型 XPath，两种解析器结果相反（156 集 / 0 条） | 未判定：需真机复验 |
| TvTFun | https://www.tvtfun.net | 分集选择器用 `@class*=` 非标准语法，lxml 不支持 | 未判定：需真机复验 |
| sorani | https://www.sorani.net | 搜索 200，分集接口 404 | DEAD：上游规则过期 |
| 7sefun | https://www.7sefun.top | 搜索页仅 4.9KB 落地页，0 条目 | DEAD：站点换域名 |
| aafun | https://www.moonci.com | `chapterRoads` 字段只有 `//` | DEAD：规则本身残缺（同站建议用 moonci） |
| baimao | https://www.baimaodm.com | 搜索 2 条，详情页 0 个播放链接（JS 渲染） | 未判定：疑需 webview |
| ezdmw | https://m.ezdmw.org | 搜索 1 条（命中公告块），线路 4 但集数 0 | PART：选择器半失效 |
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
