"""Build compact directory sort keys without shipping the graph index to readers."""
import json
import re
from bisect import bisect_right
from pathlib import Path
from urllib.parse import unquote

from corpus_review import iter_chapters, reference_texts

ROOT = Path(__file__).resolve().parents[1]


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
            if not work or work[1] != book:
                continue
            record = records[name] = {'bookMentions': entry['counts'].get(book)}
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
                matches = pattern.finditer(text)
                first = next(matches, None)
                if first and 1 + sum(1 for _ in matches) == entry['counts'][book]:
                    positions.append(first.start())
            hits = [p for p in positions if p >= 0]
            if hits:
                pos = min(hits)
                chapter = bisect_right(offsets, pos) - 1
                volume, heading = labels[chapter]
                if volume.startswith('第七部总结之后'):
                    volume = '第八部'
                record.update(volume=' '.join(volume.split()), chapter=heading,
                              order=pos, volumeOrder=next(i for i, v in enumerate(parts) if v[0] == labels[chapter][0]))
    target = ROOT / 'source/_data/character_directory.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
