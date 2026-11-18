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
from corpus_review import BOOKS, iter_chapters

ROOT = Path(__file__).resolve().parents[1]
INTRO = re.compile(r'(?:叫做|名叫|我叫|叫作|你叫|名为|他叫|她叫|祂叫)[“\"]?([\u4e00-\u9fa5]{2,5})(?=[，。！？、”\s])')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--min-count', type=int, default=11)
    parser.add_argument('--limit', type=int, default=100)
    args = parser.parse_args()
    raw = (ROOT / 'source/relationships/character-index.js').read_text(encoding='utf-8')
    entries = json.loads(raw[raw.index('['):raw.rindex(']')+1])
    names = set()
    for item in entries:
        names.update(filter(None, re.split(r'\s*/\s*', item.get('alias',''))))
        names.update([item['name'],item['short']])
    for book, path, encoding in BOOKS:
        corpus = path.read_text(encoding=encoding)
        leads = defaultdict(list)
        for volume, chapter, text in iter_chapters(path, encoding):
            for candidate in set(INTRO.findall(text)):
                if any(candidate in name or name in candidate for name in names if len(name) > 1):
                    continue
                leads[candidate].append(f'{volume} / {chapter}')
        results = [(name, corpus.count(name), refs) for name,refs in leads.items() if corpus.count(name) >= args.min_count]
        results.sort(key=lambda x:(-len(x[2]),-x[1],x[0]))
        print(f'\n{book}: {len(results)} 条未核实候选，显示前 {args.limit} 条')
        for name,count,refs in results[:args.limit]:
            print(f'{name}\t字面 {count}\t引介章节 {len(refs)}\t{refs[0]}')

if __name__ == '__main__':
    main()
