// Build the local file-to-file reading index from the site's chapter order.
const fs = require('node:fs');
const path = require('node:path');
const frontMatter = require('hexo-front-matter');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'source/timeline');
const docs = path.join(root, 'docs');
const files = new Map();
for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.md'))) {
  const metadata = frontMatter.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
  if (metadata.timeline_event !== true) continue;
  const key = metadata.event_summary?.trim()
    ? '#event-' + (metadata.event_anchor || metadata.title)
    : metadata.permalink?.replace(/^\/?timeline\//, '');
  if (!key || files.has(key)) throw new Error('事件链接缺失或重复：' + name);
  files.set(key, { name, work: metadata.event_work });
}

const index = fs.readFileSync(path.join(directory, 'index.md'), 'utf8');
const sections = index.split(/^## /m).slice(1);
const rows = ['# 事件原文顺序', '', '按各书的章节顺序列出事件。点击事件名可打开本地档案，查看时间依据和原文章节。'];
const seen = new Set();
const ordered = [];
for (const section of sections) {
  const [work, ...lines] = section.split('\n');
  for (const line of lines) {
    const volume = line.split('：', 1)[0].trim();
    for (const [, label, key] of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      const file = files.get(key);
      if (!file || file.work !== work.trim() || seen.has(key)) throw new Error('事件目录有误：' + key);
      seen.add(key);
      ordered.push({ label, file, volume, link: '[' + label + '](<../source/timeline/' + file.name + '>)' });
    }
  }
}
for (const [i, { file, volume, link }] of ordered.entries()) {
  if (ordered[i-1]?.file.work !== file.work) {
    rows.push('', '## ' + file.work, '', '| 卷 | 前一事件 | 本事件 | 后一事件 |', '| --- | --- | --- | --- |');
  }
  rows.push('| ' + [volume, ordered[i-1]?.link || '—', link, ordered[i+1]?.link || '—'].join(' | ') + ' |');
}
if (seen.size !== files.size) throw new Error('有事件尚未编入原文顺序目录');
fs.mkdirSync(docs, { recursive: true });
fs.writeFileSync(path.join(docs, '事件原文顺序.md'), rows.join('\n') + '\n');

// Each source file can also be read directly in a Markdown viewer.
for (const [position, { file }] of ordered.entries()) {
  const filename = path.join(directory, file.name);
  const source = fs.readFileSync(filename, 'utf8');
  const neighbors = [[ordered[position - 1], '前一事件'], [ordered[position + 1], '后一事件']];
  const links = neighbors.filter(([entry]) => entry).map(([entry, direction]) =>
    direction + '：[' + entry.label + '](<./' + entry.file.name + '>)');
  const nav = '<!-- event-navigation -->\n' + links.join(' · ') + '\n<!-- /event-navigation -->';
  const body = source.replace(/\n*<!-- event-navigation -->[\s\S]*?<!-- \/event-navigation -->\s*$/, '')
    .trimEnd();
  const updated = body + '\n\n' + nav + '\n';
  if (updated !== source) fs.writeFileSync(filename, updated);
}
