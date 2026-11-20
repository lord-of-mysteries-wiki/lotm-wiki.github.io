#!/usr/bin/env python3
"""Find unreviewed name-like phrases in character introductions.

Results are leads for manual review, not verified people or distinct mentions.
Each result includes the raw text frequency and number of chapters in which an
introduction pattern was found. No novel passages are written to disk.
"""
from collections import defaultdict
import argparse
import json
import re
from pathlib import Path
from corpus_review import reference_texts, iter_chapters

ROOT = Path(__file__).resolve().parents[1]
# 这些写法只提供线索：例如真名可能是误导，叫他也可能接普通称谓。
INTRO = re.compile(
    r'(?:叫做|名叫|我叫|叫作|你叫|名为|他叫|她叫|祂叫|'
    r'名字(?:是|叫(?:做|作)?)|本名(?:是|叫|为)|真名(?:是|叫|为)|'
    r'原名(?:是|叫|为)|自称(?:是|为)?|称自己为|叫他|叫她|叫祂)'
    r'[“‘\"]?([\u4e00-\u9fa5]{2,5})(?=[，。！？、”’\s])'
)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--min-count', type=int, default=50)
    parser.add_argument('--limit', type=int, default=100)
    args = parser.parse_args()
    raw = (ROOT / 'source/relationships/character-index.js').read_text(encoding='utf-8')
    entries = json.loads(raw[raw.index('['):raw.rindex(']')+1])
    names = set()
    for item in entries:
        names.update(filter(None, re.split(r'\s*/\s*', item.get('alias',''))))
        names.update([item['name'],item['short']])
    # Compare whole written names, not substrings: a short name can belong to
    # another person even when it occurs inside an indexed full name or alias.
    names = {re.sub(r'（[^）]*）$', '', name).strip('“”" ') for name in names}
    chapters = defaultdict(list)
    for book, path, encoding in reference_texts():
        chapters[book].extend(iter_chapters(path, encoding))
    corpus = "\n".join(body for contents in chapters.values() for _, _, body in contents)
    leads = defaultdict(list)
    for book, contents in chapters.items():
        for volume, chapter, body in contents:
            for candidate in sorted(set(INTRO.findall(body)) - names):
                leads[candidate].append(f'《{book}》{volume} / {chapter}')

    results = []
    for name, refs in leads.items():
        count = corpus.count(name)
        if count >= args.min_count:
            results.append((name, count, refs))
    results.sort(key=lambda row: (-len(row[2]), -row[1], row[0]))
    print(f'两部原文字面合计达到 {args.min_count} 次的未核实候选共 {len(results)} 条，显示前 {args.limit} 条')
    for name, count, refs in results[:args.limit]:
        print(f'{name}\t字面 {count}\t引介章节 {len(refs)}\t{refs[0]}')

if __name__ == '__main__':
    main()
