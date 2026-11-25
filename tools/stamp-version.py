#!/usr/bin/env python3
"""배포(푸시)하기 전에 실행: version.json에 새 버전 표시와 사이트 파일 목록을 적는다.

사이트는 version.json이 바뀐 걸 보고 '새 버전이 올라왔어요' 안내를 띄우고,
여기 적힌 파일들을 캐시 없이 다시 받아 둔다.

    python3 tools/stamp-version.py
"""
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'.git', 'firebase', 'tools', 'node_modules'}
KEEP = ('.html', '.js', '.css', '.webmanifest')

files = sorted(
    p.relative_to(ROOT).as_posix()
    for p in ROOT.rglob('*')
    if p.is_file() and p.suffix in KEEP and not (set(p.relative_to(ROOT).parts) & SKIP)
)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
(ROOT / 'version.json').write_text(
    json.dumps({'v': stamp, 'files': ['./'] + files}, ensure_ascii=False, indent=1) + '\n',
    encoding='utf-8',
)
print(f'version.json: {stamp} ({len(files)} files)')
