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
REF = re.compile(r'《(诡秘之主|宿命之环)》|(第' + NUM + r'[部卷]总结之后|第' + NUM + r'[部卷])|(第' + NUM + r'章)(?:《([^》]+)》)?|(番外)')
HEADING = re.compile(r'(第' + NUM + r'章)\s*(.+)')


def chapter_number(value):
    """Compare chapter numbers independently of Chinese or Arabic notation."""
    value = value.removeprefix('第').removesuffix('章')
    if value.isdigit():
        return int(value)
    digits = dict(zip('零一二三四五六七八九', range(10)))
    digits['〇'] = 0
    units = {'十': 10, '百': 100, '千': 1000, '万': 10000}
    total = digit = 0
    for char in value:
        if char in digits:
            digit = digits[char]
        else:
            total += (digit or 1) * units[char]
            digit = 0
    return total + digit


def normalise(text):
    return re.sub(r'[\s“”"？?！!·.、，,（()）]', '', text)


def main():
    chapters = []
    for book, path, encoding in reference_texts():
        for volume, heading, _ in iter_chapters(path, encoding):
            match = HEADING.match(heading)
            if match:
                chapters.append((book, volume, match[1], normalise(match[2])))

    from content_model import load_model
    data = load_model()
    records = []
    for relation in data['relations']:
        label = f"{relation['a']} / {relation['b']}"
        records.append((label, relation.get('sourceHint', '')))
        records.extend((label, m.get('source', '')) for m in relation.get('milestones', []))
    # Manually defined graph characters may have evidence too (for example,
    # a mirror person separated from the generated, ambiguous name index).
    for person in data['characters']:
        records.extend((person['name'], item.get('source', ''))
                       for item in person.get('classificationEvidence', []) + person.get('aliasSources', []))
    checked, titled, errors = 0, 0, []
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
                if not title and text[match.end():].startswith(' ') and not (match.start() and text[match.start()-1] == '-'):
                    # A title is unambiguous when it matches a known heading at
                    # this position; ordinary prose following a chapter is not.
                    tail = normalise(text[match.end():])
                    candidates = {h for b, _, _, h in chapters if b == book and tail.startswith(h)}
                    if candidates:
                        title = max(candidates, key=len)
                if title:
                    titled += 1
                if not any(b == book and v.replace('卷', '部').startswith(volume.replace('卷', '部'))
                           and chapter_number(n) == chapter_number(number)
                           and (not title or normalise(title) in h) for b, v, n, h in chapters):
                    errors.append(f"{label}: {book} {volume} {number}" + (f"《{title}》" if title else ''))
    print(f'已检查 {checked} 条可识别的作品、部和章节引用，其中 {titled} 条识别到标题；不匹配 {len(errors)} 条。')
    print('无书名号的标题仅在能匹配已知标题时识别；不核验章节内容、未识别的引用或关系本身。')
    for error in errors:
        print(error)
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
