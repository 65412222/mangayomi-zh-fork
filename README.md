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

> 注意：首版只有架子 + 中文站重排表 + 探针脚本，索引还是空数组。合入上游 + 拷贝修头版落地后才可导入。

## 目录

```
javascript/manga/src/zh/   中文漫画修补（拷贝修头版、包子、如漫画等）
javascript/novel/src/zh/   中文小说自写（轻小说文库起手）
javascript/anime/src/zh/   中文动画对位 + Emby 桥接模板
index.json / novel_index.json / anime_index.json   合并生成的索引
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
