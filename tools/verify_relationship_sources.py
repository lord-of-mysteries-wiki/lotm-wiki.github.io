#!/usr/bin/env python3
"""Check cited book, volume, chapter number and title against the supplied texts.

This checks headings only; it does not establish that a passage proves a relation.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from corpus_review import iter_chapters, reference_texts

ROOT = Path(__file__).resolve().parents[1]
NUM = r'[一二三四五六七八九十百千万零〇0-9]+'
REF = re.compile(r'《(诡秘之主|宿命之环)》|(第' + NUM + r'[部卷]总结之后|第' + NUM + r'[部卷])|(第' + NUM + r'章)《([^》]+)》|(番外)')
HEADING = re.compile(r'(第' + NUM + r'章)\s*(.+)')


def normalise(text):
    return re.sub(r'[\s“”"？?！!·.、，,（()）]', '', text)


def main():
    chapters = []
    for book, path, encoding in reference_texts():
        for volume, heading, _ in iter_chapters(path, encoding):
            match = HEADING.match(heading)
            if match:
                chapters.append((book, volume, match[1], normalise(match[2])))

    script = ("const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);"
              "vm.runInContext(fs.readFileSync('source/relationships/relationship-data.js','utf8')"
              "+'\\n'+fs.readFileSync('source/relationships/character-index.js','utf8')"
              "+';this.d={relations,characters,indexedCharacters}',c);console.log(JSON.stringify(c.d))")
    data = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT))
    records = []
    for relation in data['relations']:
        label = f"{relation['a']} / {relation['b']}"
        records.append((label, relation.get('sourceHint', '')))
        records.extend((label, m.get('source', '')) for m in relation.get('milestones', []))
    # Manually defined graph characters may have evidence too (for example,
    # a mirror person separated from the generated, ambiguous name index).
    for person in data['characters'] + data['indexedCharacters']:
        records.extend((person['name'], item.get('source', ''))
                       for item in person.get('classificationEvidence', []) + person.get('aliasSources', []))
    checked, errors = 0, []
    for label, text in records:
        book = volume = ''
        for match in REF.finditer(text):
            if match[1]:
                book, volume = match[1], ''
            elif match[2]:
                volume = match[2]
            elif match[5]:
                volume = '番外'
            elif book and volume:
                checked += 1
                number, title = match.group(3, 4)
                if not any(b == book and v.startswith(volume)
                           and n == number
                           and normalise(title) in h for b, v, n, h in chapters):
                    errors.append(f"{label}: {book} {volume} {number}《{title}》")
    print(f'已检查 {checked} 条带书名、卷号、章号和标题的引用；不匹配 {len(errors)} 条。')
    print('此检查不核验章节内容、未按此格式写出的引用或关系本身。')
    for error in errors:
        print(error)
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
