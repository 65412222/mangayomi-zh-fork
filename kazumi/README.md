# kazumi — Kazumi 番剧规则（国内可用性筛选镜像）

Kazumi 规则镜像 + 筛选目录。规则文件来自上游 [Predidit/KazumiRules](https://github.com/Predidit/KazumiRules)（GPL-3.0，全文见 `LICENSE-KazumiRules.txt`），**文件内容一字未改**。

本目录只做三件事：

1. 只保留实测能在国内直连、且跑通「搜索 → 详情 → 分集」的规则；
2. 提供 `index.json`，让 Kazumi 能把它当**自定义规则仓库**整包导入；
3. 记录探针口径与结果：见仓库根目录 `kazumi-sources-status.md`。

## 导入（三选一）

### A. 整包导入（推荐）

Kazumi → 设置 → 插件/规则 → 规则仓库 → 添加自定义仓库，粘贴下面任一地址：

```
https://fastly.jsdelivr.net/gh/65412222/mangayomi-zh-fork@main/kazumi/
https://gh-proxy.org/https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/kazumi/
https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/kazumi/
```

- 地址必须是**目录**或以 `index.json` 结尾；填 `github.com/...` 网页地址会被 App 直接拒绝（源码 `RulesRepositoryConfig` 有校验）。
- 2026-11-14 国内家宽实测：`fastly.jsdelivr.net` 0.69s、`gh-proxy.org` 0.65s、`raw.githubusercontent.com` 直连失败（000）、`cdn.jsdelivr.net` 失败、`ghfast.top` 超时 → **优先前两个**。

### B. 单条规则

把某个 `*.json` 的内容整段复制 → Kazumi 规则管理 → 导入 → 粘贴。App 的导入解析器支持三种载荷：

- 单个规则 JSON 对象
- JSON 数组（批量）
- `kazumi://` 分享链接（分享码内嵌规则）

### C. 不导入本仓，改用官方仓库 + 镜像

继续用官方规则仓库时，到设置里把「规则镜像」从 `direct` 改成 `gitcode` 或 `ghProxy`：

| 镜像 | 对应地址 | 2026-11-14 实测 |
|---|---|---|
| direct（默认） | raw.githubusercontent.com | 000 失败 |
| gitcode | raw.gitcode.com/gh_mirrors/ka/KazumiRules | 200 / 0.26s |
| ghProxy | gh-proxy.org 前缀 | 200 / 0.65s |
| ghfast | ghfast.top 前缀 | 超时（10s） |

> 注意：镜像开关只对**官方仓库地址**生效（源码 `RulesMirrorInterceptor` 只匹配官方 pluginShop 常量）。自定义仓库不会被镜像，所以要自己填国内可达的地址。

## 规则清单

| 规则 | 站点 | 规则版本 | 模式 | 搜索 | 分集 |
|---|---|---|---|---|---|
| MXdm | dcc3.com | 2.4 | xpath | ✅ | 4 线路 / 40+ 集 |
| LMM | lmm22.com | 2.4 | api + xpath | ✅ | 2 线路 / 48 集 |
| moonci | moonci.com | 1.1 | api + xpath | ✅ | 3 线路 / 30 集 |
| DM84 | dmbus.cc | 1.4 | xpath | ✅ | 3 线路 / 30 集 |
| akianime | akianime.cc | 1.4 | xpath | ✅ | 3 线路 / 84 集 |
| dalvdm | sbdl.cc | 1.2 | api + xpath | ✅ | ✅ |
| giriGiriLove | ani.girigirilove.com | 2.7 | api | ✅ | 19 集（1/3 轮抽查失败） |

样本番：`葬送的芙莉莲`。三轮复测数据见 `../kazumi-sources-status.md`。

## 探针

```bash
bash scripts/kazumi-probe.sh          # 首页 + 搜索页状态码/耗时，写 kazumi-health.json
```

## 边界

- 本仓**不托管任何视频内容**，规则文件只是页面结构描述（XPath / API 路径）。
- 站点可用性随时变化；规则失效先看上游有没有新版（上游会用 `"deprecated": true` 标记死站）。
- 上游 86 条规则里 68 条已标 `deprecated`（占 79%），别按数量判断「源多」。
