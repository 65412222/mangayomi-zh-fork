#!/bin/bash
# Kazumi 规则站探针：首页 + 搜索页状态码/耗时，结果写 kazumi-health.json
# 用法：bash scripts/kazumi-probe.sh [关键词]
set -u
UA_DEFAULT="Mo""zilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
UA="${KAZUMI_UA:-$UA_DEFAULT}"
KW="${1:-葬送的芙莉莲}"
KW_ENC=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$KW")
OUT="$(dirname "$0")/../kazumi-health.json"

# 站点|搜索URL模板（@keyword 占位）；api 模式站点留空，只探首页
SITES="
MXdm|https://www.dcc3.com|https://www.dcc3.com/search/?wd=@keyword
LMM|https://www.lmm22.com|
moonci|https://www.moonci.com|
DM84|https://dmbus.cc|https://dmbus.cc/s----------.html?wd=@keyword
akianime|https://www.akianime.cc|https://www.akianime.cc/bgmsearch/-------------.html?wd=@keyword
dalvdm|https://www.sbdl.cc|
giriGiriLove|https://ani.girigirilove.com|
TvTFun|https://www.tvtfun.net|https://www.tvtfun.net/api/client/anime?keyword=@keyword&page=1&pageSize=24
ezdmw|https://m.ezdmw.org|https://m.ezdmw.org/Index/search.html?searchText=@keyword
"

echo "{" > "$OUT"
echo "  \"checked_at\": \"$(date -u +%FT%TZ)\"," >> "$OUT"
echo "  \"keyword\": \"$KW\"," >> "$OUT"
echo "  \"sites\": {" >> "$OUT"
first=1
echo "$SITES" | while IFS='|' read -r name base search; do
  [ -z "$name" ] && continue
  r=$(curl -sk -m 12 -o /dev/null -w "%{http_code} %{time_total}" -L -A "$UA" \
      -H "Accept-Language: zh-CN,zh;q=0.9" "$base/" 2>/dev/null)
  code=$(echo "$r" | awk '{print $1}')
  t=$(echo "$r" | awk '{print $2}')
  scode="-"; st="-"
  if [ -n "$search" ]; then
    su=$(echo "$search" | sed "s/@keyword/$KW_ENC/")
    r2=$(curl -sk -m 12 -o /dev/null -w "%{http_code} %{time_total}" -L -A "$UA" \
         -H "Referer: $base/" "$su" 2>/dev/null)
    scode=$(echo "$r2" | awk '{print $1}')
    st=$(echo "$r2" | awk '{print $2}')
  fi
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  printf '    "%s": {"base": "%s", "http": "%s", "time_s": "%s", "search_http": "%s", "search_time_s": "%s"}' \
    "$name" "$base" "$code" "$t" "$scode" "$st" >> "$OUT"
  echo "$name base=$code/${t}s search=$scode/${st}s"
  sleep 1
done
echo "" >> "$OUT"
echo "  }" >> "$OUT"
echo "}" >> "$OUT"
echo "wrote $OUT"
