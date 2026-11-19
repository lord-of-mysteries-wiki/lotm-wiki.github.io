#!/usr/bin/env python3
"""Locate mentions and co-occurrences in the supplied novels for manual review.

Usage: python3 tools/corpus_review.py NAME [OTHER_NAME] [--limit N]
Same-chapter mentions are search leads, not evidence of a relationship.
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS = (
    ('诡秘之主', ROOT / '诡秘之主-原文/《诡秘之主》精校版全本.txt', 'utf-8-sig'),
    ('宿命之环', ROOT / '宿命之环-原文/宿命之环++1到7部-第50章++暗藏的条件.txt', 'gb18030'),
)
NUM = r'[一二三四五六七八九十百千万零〇0-9]+'
VOLUME = re.compile(r'^\s*(第' + NUM + r'[部卷]\s+[^\n\r]{1,50})\s*$')
SUMMARY = re.compile(r'^\s*第' + NUM + r'[部卷]总结\s*$')
CHAPTER = re.compile(r'^\s*(第' + NUM + r'章(?:\s*[^\n\r]{1,70})?)\s*$')
EXTRA = re.compile(r'^一个普通人的日常（' + NUM + r'）$')

def iter_chapters(path, encoding):
    volume, heading, lines = '', '', []
    with path.open(encoding=encoding, errors='strict') as source:
        for line in source:
            value = line.strip()
            vol = VOLUME.fullmatch(value)
            chapter = CHAPTER.fullmatch(value)
            extra = EXTRA.fullmatch(value)
            # The first book appends author notes and separately titled extras
            # after the final chapter. They are not part of that chapter.
            if value in ('完本感言（上）', '完本感言（下）', '番外'):
                if heading and ''.join(lines).strip():
                    yield volume, heading, ''.join(lines)
                heading, lines = '', []
                if value == '番外':
                    volume = '番外'
                continue
            if extra:
                if heading and ''.join(lines).strip():
                    yield volume, heading, ''.join(lines)
                volume, heading, lines = '番外', value, []
                continue
            if SUMMARY.fullmatch(value):
                if heading:
                    yield volume, heading, ''.join(lines)
                heading, lines = '', []
                volume = value + '之后（原文缺少卷名标题）'
                continue
            if vol or chapter:
                if heading:
                    yield volume, heading, ''.join(lines)
                    heading, lines = '', []
                if vol:
                    volume = vol.group(1)
                else:
                    heading = chapter.group(1)
            elif heading:
                lines.append(line)
    if heading and ''.join(lines).strip():
        yield volume, heading, ''.join(lines)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('name')
    parser.add_argument('other', nargs='?')
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()
    for book, path, encoding in BOOKS:
        matches = 0
        for volume, heading, body in iter_chapters(path, encoding):
            if args.name not in body or (args.other and args.other not in body):
                continue
            matches += 1
            if matches > args.limit:
                continue
            print(f'{book} · {volume} · {heading}  ({body.count(args.name)} / {body.count(args.other) if args.other else "—"})')
            if args.other:
                # Print the nearest occurrence as a lead, with no assertion of relationship.
                best = None
                for match in re.finditer(re.escape(args.name), body):
                    pos = body.find(args.other, max(0, match.start()-160), match.end()+160)
                    if pos >= 0:
                        best = (min(match.start(), pos), max(match.end(), pos+len(args.other)))
                        break
                if best:
                    a,b = best
                    print('  ', re.sub(r'\s+', ' ', body[max(0,a-55):min(len(body),b+55)]))
        print(f'{book}: {matches} 章匹配；最多显示 {args.limit} 章')

if __name__ == '__main__':
    main()
