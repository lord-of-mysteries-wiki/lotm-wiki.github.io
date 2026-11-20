#!/usr/bin/env python3
"""Check that relationship-graph classifications come from character files."""
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'source/characters/entries'
index = (ROOT / 'source/relationships/character-index.js').read_text(encoding='utf-8')
people = json.loads(index.split('const indexedCharacters = ', 1)[1].rstrip().removesuffix(';'))
errors = []
organization_nodes = set()
unit_parents = {}
for path in sorted(DIRECTORY.glob('*.md')):
    match = re.search(r'^graph_classifications: (.+)$', path.read_text(encoding='utf-8'), re.M)
    if not match:
        errors.append(f'{path.name}: missing graph_classifications')
        continue
    try:
        data = json.loads(match[1])
        if not isinstance(data, dict) or set(data) - {'organization', 'nationality'}:
            raise ValueError('invalid categories')
        for kind, facts in data.items():
            if not isinstance(facts, list) or any(not isinstance(f, dict) or not f.get('value') or not f.get('source') for f in facts):
                raise ValueError(f'invalid {kind} facts')
            if kind == 'organization':
                for fact in facts:
                    organization_nodes.add(fact['value'])
                    if fact.get('unit'):
                        unit_parents.setdefault(fact['unit'], set()).add(fact['value'])
    except (ValueError, TypeError) as exc:
        errors.append(f'{path.name}: {exc}')

for unit in sorted(organization_nodes.intersection(unit_parents)):
    parents = '、'.join(sorted(unit_parents[unit]))
    errors.append(f'{unit} 同时列作独立组织及下属单位，请核对其所属组织（{parents}）')

# The disputed identity is documented without a separate graph node.
directory_only = {'杰森·贝利亚'}
linked_profiles = set()
for person in people:
    actual = [f for f in person.get('classificationEvidence', []) if f.get('kind') in ('organization', 'nationality')]
    url = person.get('documentProfileUrl')
    if not url:
        if actual:
            errors.append(f'{person["id"]}: classifications without a matched document')
        continue
    path = DIRECTORY / (unquote(url.rstrip('/').split('/')[-1]) + '.md')
    linked_profiles.add(path.stem)
    if not path.is_file():
        errors.append(f'{person["id"]}: missing document')
        continue
    match = re.search(r'^graph_classifications: (.+)$', path.read_text(encoding='utf-8'), re.M)
    if not match:
        continue  # Already reported above.
    data = json.loads(match[1])
    expected = [{'kind': kind, **fact} for kind, facts in data.items() for fact in facts]
    if actual != expected:
        errors.append(f'{person["id"]}: classifications differ from document')

for path in DIRECTORY.glob('*.md'):
    if path.stem not in linked_profiles and path.stem not in directory_only:
        errors.append(f'{path.name}: missing from graph index')

print(f'Checked {len(people)} graph entries and {len(list(DIRECTORY.glob("*.md")))} character documents; {len(errors)} errors.')
for error in errors:
    print(error)
if errors:
    raise SystemExit(1)
