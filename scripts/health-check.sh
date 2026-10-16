#!/bin/bash
# 中文站存活探针：curl首页状态码+耗时，结果输出health.json
# 用法：bash scripts/health-check.sh
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
SITES="
https://www.mangacopy.com
https://www.manhuagui.com
http://www.77mh.xyz
https://www.gufengmh.com
https://www.dmzj.com
https://www.baozimh.com
https://m.rumanhua1.com
https://mangadex.org
https://comick.io
https://www.webtoons.com
https://ixdzs8.com/
https://www.quanben.io/
https://www.69shu.xyz
https://www.linovel.net
https://www.bilinovel.com
https://www.novel543.com/
https://huaweiba.live
https://mikanani.me
http://www.mucpan.cc
http://ffzy.tv
https://tiankongzy.com
https://mihdr.top
https://tv.yydsys.top
https://www.wogg.one
https://www.jisuzy.com
https://360zy.com
http://www.iyinghua.com
https://hanime1.me
https://jable.tv
https://supjav.com
https://rouvideo.com
https://hanime.tv
https://www.yodu.org
https://www.lightnovel.us
https://masiro.me
https://www.37yq.com
"
OUT="$(dirname "$0")/../health.json"
echo "{" > "$OUT"
echo "  \"checked_at\": \"$(date -u +%FT%TZ)\"," >> "$OUT"
echo "  \"sites\": {" >> "$OUT"
first=1
for u in $SITES; do
  r=$(curl -sk -m 12 -o /dev/null -w "%{http_code} %{time_total}" -L -A "$UA" "$u" 2>/dev/null)
  code=$(echo "$r" | awk '{print $1}')
  t=$(echo "$r" | awk '{print $2}')
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  printf '    "%s": {"http": "%s", "time_s": "%s"}' "$u" "$code" "$t" >> "$OUT"
  echo "$code $t <- $u"
  sleep 1
done
echo "" >> "$OUT"
echo "  }" >> "$OUT"
echo "}" >> "$OUT"
echo "wrote $OUT"
