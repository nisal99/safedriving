#!/usr/bin/env python3
"""Collect the official KoROAD video for each video question (966–1000).

KoROAD publishes one page per video question on its "동영상 문제" board:
  https://www.safedriving.or.kr/subExamBoard/selectSubExamBoardMovieList.do
Titles look like "[2025년 8월 25일 시행] 1,2종보통 학과시험 문제은행 동영상(996)". Some numbers have
several versions; the newest one for Class 1/2 (1,2종보통) is used. The page links the video file
on koroad.or.kr (MP4 or WMV).

Only links are stored (data/official-videos.json); no video is copied, because KoROAD's pages say
"※ 상업적 이용을 금지합니다" (commercial use prohibited).

    python3 scripts/fetch_video_links.py
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://www.safedriving.or.kr/subExamBoard"
OUT = Path(__file__).resolve().parent.parent / "data" / "official-videos.json"
FIRST, LAST = 966, 1000


def get(url: str, tries: int = 6) -> str:
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception:  # the site drops connections now and then
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f"could not fetch {url}")


def main():
    entries: dict[int, tuple] = {}
    first = get(f"{BASE}/selectSubExamBoardMovieList.do?pageIndex=1")
    pages = int(re.search(r"var totalPage = (\d+);", first).group(1))
    for page in range(1, pages + 1):
        h = first if page == 1 else get(f"{BASE}/selectSubExamBoardMovieList.do?pageIndex={page}")
        for sn, title in re.findall(r'fnGoDetail\("(\d+)"\);\'>([^<]+)<', h):
            title = title.strip()
            m = re.search(r"동영상\((\d+)\)", title)
            if "1,2종보통" not in title or not m:
                continue  # motorcycle bank or unrelated post
            n = int(m.group(1))
            date = tuple(int(x) for x in re.findall(r"\d+", title.split("]")[0])) + (0,)
            key = (date[0], date[1], date[2] if len(date) > 3 else 0, int(sn))
            if n not in entries or key > entries[n][0]:
                entries[n] = (key, int(sn), title)

    videos = {}
    for n in range(FIRST, LAST + 1):
        if n not in entries:
            raise SystemExit(f"No official video found for question {n}")
        _, sn, title = entries[n]
        page_url = f"{BASE}/selectSubExamBoardMovie.do?bbscttSn={sn}"
        h = get(page_url)
        m = re.search(r'href="(https://www\.koroad\.or\.kr/file/FileDown\.do\?atchFileId=[^"]+)"[^>]*>([^<]*)', h)
        if not m:
            raise SystemExit(f"No video file link on {page_url}")
        file_url, label = html.unescape(m.group(1)), m.group(2)
        ext = re.search(r"\.(mp4|wmv|avi|mov)\)", label, re.I)
        videos[str(n)] = {
            "title": title,
            "page": page_url,
            "file": file_url,
            "format": (ext.group(1).lower() if ext else "unknown"),
        }
        print(n, videos[str(n)]["format"], title)

    OUT.write_text(json.dumps({"source": f"{BASE}/selectSubExamBoardMovieList.do", "videos": videos}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(videos)} video links to {OUT}")


if __name__ == "__main__":
    main()
