#!/usr/bin/env python3
"""Find chapter-level relationship leads for manual review.

A shared sentence and a relationship word are only search leads; they do not
prove a relationship. Short/ambiguous names are excluded and no results are
added to the website automatically. Usage: python3 tools/discover_relationships.py
"""
import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from corpus_review import BOOKS, iter_chapters

ROOT = Path(__file__).resolve().parents[1]
CUES = re.compile(r'父亲|母亲|兄弟|兄妹|姐弟|姐妹|哥哥|姐姐|弟弟|妹妹|妻子|丈夫|儿子|女儿|老师|学生|队友|同伴|朋友|下属|手下|信使')
LOAD = "const m=require('./tools/lib/content-model').loadModel(); process.stdout.write(JSON.stringify({...m,indexedCharacters:[]}));"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--book', choices=[b[0] for b in BOOKS])
    parser.add_argument('--limit', type=int, default=30)
    args = parser.parse_args()
    data = json.loads(subprocess.check_output(['node','-e',LOAD], cwd=ROOT, text=True))
    # Only use unambiguous distinct short names. Generic titles, one/two-letter
    # names and overlapping forms are not reliable enough for automatic leads.
    terms = defaultdict(list)
    for character in data['indexedCharacters']:
        name = character['short']
        if len(name) >= 3 and '先生' not in name and '夫人' not in name:
            terms[name].append(character['id'])
    terms = {name: ids[0] for name, ids in terms.items() if len(ids) == 1}
    pattern = re.compile('|'.join(re.escape(s) + ('(?!斯特拉)' if s == '查拉图' else '') for s in sorted(terms, key=lambda x:(-len(x),x))))
    existing = {tuple(sorted((r['a'],r['b']))) for r in data['relations']}
    names = {p['id']:p['name'] for p in data['indexedCharacters']}
    found = defaultdict(dict)
    for book, path, encoding in BOOKS:
        if args.book and book != args.book:
            continue
        for volume, chapter, body in iter_chapters(path, encoding):
            for paragraph in body.splitlines():
                if not CUES.search(paragraph):
                    continue
                ids = list(dict.fromkeys(terms[m.group()] for m in pattern.finditer(paragraph)))
                if len(ids) != 2:
                    continue
                pair = tuple(sorted(ids))
                if pair in existing:
                    continue
                ref = (book, volume, chapter)
                found[pair].setdefault(ref, paragraph.strip())
    leads = sorted(found.items(), key=lambda x:(-len(x[1]),x[0]))
    print(f'待核对人物对：{len(leads)}；同段和关系词不能证明人物关系')
    for pair, refs in leads[:args.limit]:
        ref, paragraph = next(iter(refs.items()))
        # This is displayed only locally, never copied to the public site.
        print(f"\n{names[pair[0]]} × {names[pair[1]]}（{len(refs)} 个章节线索）")
        print(' · '.join(ref))
        print(re.sub(r'\s+', ' ', paragraph)[:180])

if __name__ == '__main__':
    main()
