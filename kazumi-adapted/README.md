# kazumi-adapted — 适配版规则目录

`kazumi/` 是上游逐字节镜像（7 条实测可用），本目录是**加了适配的完整目录（10 条）**。两者导入方式相同，选一个加即可：

```
https://fastly.jsdelivr.net/gh/65412222/mangayomi-zh-fork@main/kazumi-adapted/
https://gh-proxy.org/https://raw.githubusercontent.com/65412222/mangayomi-zh-fork/main/kazumi-adapted/
```

改动清单（TvTFun / ezdmw 两条改过；baimao 是从上游补进来的第 10 条，未改一字；其余 7 条与 `kazumi/` 相同）：

| 规则 | 版本 | 改动 | 原因 |
|---|---|---|---|
| TvTFun | 1.3 → 1.4 | `chapterRoads`: `//ol[@class*='tvt-watch-episodes']` → `//ol[contains(@class,'tvt-watch-episodes')]` | `@class*=` 非标准 XPath，标准工具与解析器行为不一致 |
| baimao | 1.0 | 未改（从上游候选中补入） | 之前判「疑需 webview」是误判，同口径复测可通过：来自深渊 13 集、觉醒的神秘 11 集、学生会 6 集 |
| ezdmw | 1.2 → 1.3 | `chapterRoads`: `//section[@class='anthology'][1]/div[contains(@class,'line_button')]` → `//section[@class='anthology'][1]`；`chapterResult`: 并集 `"/self::*[...]/following-sibling::a"` → `//a[@class='circuit_switch1']` | 原并集带前导斜杠且把三条线路锚点全收进来（13×3），改为只取主线 13 集 |

实测（2026-11-14，`scripts/kazumi-verify.py kazumi-adapted 来自深渊 觉醒的神秘 脑洞学生会`）：

| 规则 | 来自深渊 | 觉醒的神秘 | 脑洞学生会 |
|---|---|---|---|
| TvTFun | 黄金乡 12 集 + 启程之拂晓 1 集 | 无 | 学生会也有洞！6 集 |
| ezdmw | 13 集（剧场版 1 集） | 无 | 无 |
| baimao | 13 集 × 6 线路 | **11 集** | 学生会也有洞！6 集（另有 CM 4 集） |

适配方法见仓库根目录 `kazumi-rule-adaptation.md`。
