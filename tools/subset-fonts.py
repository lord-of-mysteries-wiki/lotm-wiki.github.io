"""Build one variable WOFF2 per Chinese font from the site's content and UI."""
from pathlib import Path
from tempfile import TemporaryDirectory
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
extensions = {'.md', '.html', '.ejs', '.js', '.css', '.styl', '.json', '.yml', '.svg'}
characters = set(range(32, 127))
for folder in ('source', 'themes/lotm'):
    for path in (ROOT / folder).rglob('*'):
        if path.is_file() and path.suffix in extensions:
            characters.update(map(ord, path.read_text(encoding='utf-8')))
characters.update(map(ord, (ROOT / '_config.yml').read_text(encoding='utf-8')))

for family in ('noto-sans-sc', 'noto-serif-sc'):
    original = ROOT / 'tools/font-sources' / (family + '.woff2')
    output = ROOT / 'source/fonts' / family / (family + '-site.woff2')
    with TTFont(original, recalcTimestamp=False) as font:
        expected = characters.intersection(font.getBestCmap())
        axes = [(a.axisTag, a.minValue, a.maxValue) for a in font['fvar'].axes]
        options = subset.Options()
        options.layout_features = ['*']
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=expected)
        worker.subset(font)
        with TemporaryDirectory(dir=output.parent) as tmp:
            candidate = Path(tmp) / output.name
            font.save(candidate)
            with TTFont(candidate) as check:
                assert expected <= set(check.getBestCmap())
                assert axes == [(a.axisTag, a.minValue, a.maxValue) for a in check['fvar'].axes]
            candidate.replace(output)
    print(f'{family}: {len(expected)} characters, {original.stat().st_size} -> {output.stat().st_size} bytes')
