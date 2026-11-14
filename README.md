# mangayomi-zh-fork

Mangayomi 中文源维护 fork：全量镜像 + 中文修补。托管走 GitHub raw，不需要 VPS、不开端口。

- 上游：kodjodevf 官方仓 / m2k3a / Mallyd11（动画）/ LNReader（小说）/ ZWolken（轻小说阅读书源）
- 本仓只做三件事：合上游索引、修中文站兼容（UA/域名/反爬头）、记存活探针。

## 导入（Avail after first push）

Mangayomi App 内：More → Settings → Browse → Add repository，逐条贴：

```
https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/index.json
https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/novel_index.json
https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/anime_index.json
```

> 状态：索引已合并（漫画592/中文16，动画97/中文14，小说9/中文0），可导入。拷贝修头版待落地。

### Kazumi 番剧规则（另一套 App，同一仓）

Kazumi 走「规则仓库」而不是扩展索引：设置 → 插件/规则 → 规则仓库 → 添加自定义仓库，贴：

```
https://fastly.jsdelivr.net/gh/65412222/mangayomi-zh-fork@main/kazumi/
https://gh-proxy.org/https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/kazumi/
```

两套目录，导入任选其一：

| 目录 | 内容 | 地址 |
|---|---|---|
| `kazumi/` | 上游逐字节镜像，7 条实测可用 | `.../mangayomi-zh-fork@main/kazumi/` |
| `kazumi-adapted/` | 加适配的完整目录，10 条（多 TvTFun、ezdmw、baimao） | `.../mangayomi-zh-fork@main/kazumi-adapted/` |

筛选与实测见 `kazumi-sources-status.md`，适配方法与断点分类见 `kazumi-rule-adaptation.md`。上游 86 条里 68 条已标 deprecated，别按条数判断。

## 目录

```
javascript/manga/src/zh/   中文漫画修补（拷贝修头版、包子、如漫画等）
javascript/novel/src/zh/   中文小说自写（轻小说文库起手）
javascript/anime/src/zh/   中文动画对位 + Emby 桥接模板
index.json / novel_index.json / anime_index.json   合并生成的索引
kazumi/                    Kazumi 番剧规则仓（index.json + 7 条实测规则 + 上游许可）
kazumi-health.json         Kazumi 站点探针结果
scripts/kazumi-probe.sh    Kazumi 站点探针脚本
scripts/kazumi-index.py    由 kazumi/*.json 重建规则索引
kazumi-sources-status.md   Kazumi 规则实测表（LIVE/PART/WAF/DEAD + 指标）
kazumi-adapted/            适配版规则目录（10 条，含 TvTFun/ezdmw 修正 + baimao）
kazumi-rule-adaptation.md  规则适配手册（字段语义、六类断点、验证口径）
scripts/kazumi-diag.py     单条规则断点诊断
scripts/kazumi-verify.py   规则目录回归（搜索→详情→分集）
health.json                 存活探针结果（脚本每日更新）
scripts/health-check.sh     curl 探针脚本
zh-sites-status.md          中文站重排表（LIVE/WAF/DOWN/PROBE）
```

## 上游索引来源

- 漫画：https://kodjodevf.github.io/mangayomi-extensions/index.json
- 小说：https://kodjodevf.github.io/mangayomi-extensions/novel_index.json
- 动画：https://raw.githubusercontent.com/m2k3a/mangayomi-extensions/main/anime_index.json（官方没有，从 m2k3a 合入）

## 健康检查

```bash
bash scripts/health-check.sh
```

结果写回 `health.json`，装之前先看这份。中文站重排细节见 `zh-sites-status.md`。

## 维护状态（2026-10-16 实测）

| 仓 | 最近提交 | 状态 |
|---|---|---|
| Mallyd11 anime | 2026-10-14 | 活跃 |
| Swakshan | 2026-10-14 | 活跃 |
| m2k3a | 2026-09-03 | 较活跃 |
| entityJY | 2026-01-08 | 慢 |
| Freitez93 | 2025-12-17 | 慢 |
| kodjodevf 官方 | 2025-10-01 | 慢 |

## License

MIT。转载上游扩展请保留原作者信息；轻小说书源（ZWolken 系）转载请保留原源名称与注释。
