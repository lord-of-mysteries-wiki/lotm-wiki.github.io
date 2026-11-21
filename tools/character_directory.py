"""Build compact directory sort keys without shipping the graph index to readers."""
import json
import re
from bisect import bisect_right
from pathlib import Path
from urllib.parse import unquote

from corpus_review import iter_chapters, reference_texts
from verify_relationship_sources import chapter_number

ROOT = Path(__file__).resolve().parents[1]


# Counts use the spoken name within the work where the identity was reviewed.
FIRST_BOOK_NAMES = {
    '安妮（奥黛丽的贴身女仆）': '安妮',
    '黑斯（手杖匠人）': '黑斯',
    '麦格文先生（韦尔奇之父）': '麦格文先生',
    '艾略特·维克罗尔': '艾略特',
    '斯卡特': '斯卡特',
}

# The island 托斯卡特 appears after the housing agent's two early chapters.
SCOTT_NAME_PATTERN = re.compile(r'(?<!托)斯卡特')

# These short sequel names also occur inside unrelated longer names or words.
SEQUEL_NAME_PATTERNS = {
    '梅森（巴纳摩港）': re.compile(r'梅森(?!咖啡馆)'),
    '泰斯': re.compile(r'(?<!唐)泰斯(?!利安)'),
    '雅顿': re.compile(r'(?<!莉)雅顿'),
}


def chapter_key(heading):
    match = re.match(r'(第[一二三四五六七八九十百千万零〇0-9]+章)\s*(.*)', heading)
    return (chapter_number(match[1]), match[2]) if match else heading


def reviewed_mentions(scope, parts, offsets):
    """Count only the named passages in one profile's reviewed volume."""
    if scope['chapters'] == []:
        # All name matches can belong to an impersonator.
        return 0, -1
    requested = {chapter_key(chapter) for chapter in scope['chapters']}
    if not requested or len(requested) != len(scope['chapters']):
        raise ValueError(f'具名章节无效或重复：{scope}')
    forms = sorted(scope.get('forms', [scope['term']]), key=len, reverse=True)
    alternatives = '(?:' + '|'.join(re.escape(form) for form in forms) + ')'
    pattern = re.compile(alternatives + (
        '(?!' + re.escape(scope['exclude_suffix']) + ')' if scope.get('exclude_suffix') else ''))
    count = 0
    first = None
    for index, (volume, chapter, body) in enumerate(parts):
        if volume.replace('卷', '部') != scope['volume'].replace('卷', '部') or chapter_key(chapter) not in requested:
            continue
        matches = list(pattern.finditer(body))
        if not matches:
            raise ValueError(f'章节中未找到本人称呼：{chapter} {scope["term"]}')
        requested.remove(chapter_key(chapter))
        count += len(matches)
        if first is None:
            first = offsets[index] + matches[0].start()
    if requested:
        raise ValueError(f'未找到章节：{scope["volume"]} {sorted(requested)}')
    return count, first


def build_directory(entries):
    sequence_paths = {}
    for path in sorted((ROOT / 'source/worldview/pathways').glob('*/序列*-*.md')):
        sequence_paths.setdefault(path.stem.split('-', 1)[1], path.parent.name)
    sequence_paths.update({'宿命': '舞蹈家途径', '黑夜': '不眠者途径'})
    chapters = {}
    for book, path, encoding in reference_texts():
        chapters.setdefault(book, []).extend(iter_chapters(path, encoding))

    records = {}
    for book, parts in chapters.items():
        offsets, labels, bodies = [], [], []
        offset = 0
        for volume, heading, body in parts:
            offsets.append(offset)
            labels.append((volume, heading))
            bodies.append(body)
            offset += len(body) + 1
        text = '\n'.join(bodies)
        for entry in entries:
            url = entry.get('documentProfileUrl')
            if not url:
                continue
            name = unquote(url.rstrip('/').split('/')[-1])
            profile = (ROOT / 'source/characters/entries' / (name + '.md')).read_text()
            work = re.search(r'^profile_work: "(.+)"', profile, re.M)
            if not work or book != next((b for b in chapters if b in work[1].split('、')), None):
                continue
            record = records[name] = {'counts': entry['counts'], 'work': book}
            pathways = {}
            for fact in entry.get('classificationEvidence', []) + entry.get('progression', []):
                value = fact.get('pathway') or (fact.get('value') if fact.get('kind') in ('pathway', 'sequence') else None)
                if not value or fact.get('relation') == 'authority':
                    continue
                canonical = sequence_paths.get(value, value + '途径' if fact.get('kind') != 'sequence' else None)
                if canonical:
                    inferred = fact.get('certainty') == 'inferred'
                    pathways[canonical] = pathways.get(canonical, True) and inferred
            record['pathways'] = [{'name': name, 'inferred': inferred} for name, inferred in pathways.items()]
            terms = entry['mentionTerm'].split(' / ')
            # Restricted counts can refer to homonyms. Use a qualified full name
            # or require the literal count to agree with the reviewed count.
            qualified = [name] if '·' in name and '（' not in name and '镜中' not in name else []
            positions = [text.find(term) for term in qualified]
            if all(terms) and entry['counts'].get(book, 0):
                pattern = re.compile('|'.join(map(re.escape, sorted(terms, key=len, reverse=True))))
                if book == '诡秘之主' and name == '斯卡特':
                    pattern = SCOTT_NAME_PATTERN
                if book == '宿命之环' and name in SEQUEL_NAME_PATTERNS:
                    pattern = SEQUEL_NAME_PATTERNS[name]
                matches = pattern.finditer(text)
                first = next(matches, None)
                if first and 1 + sum(1 for _ in matches) == entry['counts'][book]:
                    positions.append(first.start())
            scoped = re.search(r'^profile_named_mentions: (.+)$', profile, re.M)
            if scoped:
                scope = json.loads(scoped[1])
                if work[1] != book:
                    raise ValueError(f'具名章节需对应单一作品：{name}')
                sections = scope.get('scopes', [scope])
                seen_chapters = set()
                count, first = 0, -1
                for section in sections:
                    keys = {(section['volume'], heading) for heading in section['chapters']}
                    if seen_chapters & keys:
                        raise ValueError(f'具名章节在多段中重复：{name}')
                    seen_chapters.update(keys)
                    subtotal, position = reviewed_mentions({**scope, **section}, parts, offsets)
                    count += subtotal
                    if position >= 0 and (first < 0 or position < first):
                        first = position
                entry.update(mentionTerm=scope['term'], mentions=count, matchNote=scope['note'])
                entry['counts'] = {title: count if title == book else 0 for title in chapters}
                record['counts'] = entry['counts']
                positions = [first]
            hits = [p for p in positions if p >= 0]
            if hits:
                pos = min(hits)
                chapter = bisect_right(offsets, pos) - 1
                volume, heading = labels[chapter]
                record.update(volume=' '.join(volume.split()), chapter=heading,
                              order=pos, volumeOrder=next(i for i, v in enumerate(parts) if v[0] == labels[chapter][0]))
    target = ROOT / 'source/_data/character_directory.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
