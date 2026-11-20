#!/usr/bin/env node
// Generate review candidates only; never edit wiki pages.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const frontMatter = require('hexo-front-matter');
const eventSummaryParts = require('../themes/lotm/lib/event-summary-parts');
const { lexer, walkTokens, Lexer } = require('marked');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'source');
const output = path.resolve(root, process.argv[2] || 'docs/wiki-link-suggestions.tsv');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);
}
const pages = files(source).sort().map(file => {
  const raw = fs.readFileSync(file, 'utf8');
  const data = frontMatter.parse(raw);
  const rel = path.relative(source, file).split(path.sep).join('/');
  const url = String(data.permalink || rel.replace(/index\.md$/, '').replace(/\.md$/, '.html'));
  return { file, name: String(data.title || '').trim(), body: data._content || '', url, brief: Boolean(data.timeline_event && String(data.event_summary || '').trim()), summary: String(data.event_summary || ''), summaryLinks: Array.isArray(data.event_summary_links) ? data.event_summary_links : [] };
});
const names = new Map();
for (const page of pages) {
  // Short/common names and aliases require context; retain them as review candidates.
  const rel = path.relative(source, page.file).split(path.sep).join('/');
  if (!/^(characters\/entries|artifacts\/entries|worldview\/(?:pathways|organizations|countries))\//.test(rel)) continue;
  if (page.name.length < 2 || /[\r\n]/.test(page.name)) continue;
  if (!names.has(page.name)) names.set(page.name, []);
  names.get(page.name).push(page);
}
const terms = [...names.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh'));
const pattern = new RegExp(terms.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
const relative = p => path.relative(root, p).split(path.sep).join('/');
const rows = [];
// Rejections are tied to the exact source line and target set, so edits or
// newly discovered duplicate titles cause a fresh review rather than hiding it.
const reviewFile = path.join(root, 'tools/wiki-link-rejections.json');
const rejected = new Set(fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')).map(item => item.key) : []);
function reviewKey(file, term, targets, line) {
  return crypto.createHash('sha256').update(JSON.stringify([relative(file), term, targets.map(p => relative(p.file)).sort(), line.trim()])).digest('hex');
}
const normalize = value => path.posix.normalize('/' + String(value).split(/[?#]/)[0]).replace(/\/index\.html$/, '/').replace(/\/$/, '');
// Previously reviewed summary labels can reveal aliases that are not page
// titles. They are suggestions only: a label may mean something else elsewhere.
const aliasTargets = new Map();
for (const page of pages) for (const link of eventSummaryParts({event_summary: page.summary, event_summary_links: page.summaryLinks})) {
  if (!link || typeof link.text !== 'string' || link.text.length < 2 || typeof link.target !== 'string') continue;
  if (!aliasTargets.has(link.text)) aliasTargets.set(link.text, new Set());
  aliasTargets.get(link.text).add(normalize(link.target));
}
const pagesByUrl = new Map();
for (const page of pages) {
  const url = normalize(page.url);
  if (!pagesByUrl.has(url)) pagesByUrl.set(url, []);
  pagesByUrl.get(url).push(page);
}
function linkedTargets(page) {
  const links = new Set();
  const base = page.url.endsWith('/') ? page.url : path.posix.dirname(page.url) + '/';
  walkTokens(lexer(page.body), token => {
    if (token.type !== 'link') return;
    const href = token.href.split('#')[0].split('?')[0];
    if (href && !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(href)) {
      try { links.add(normalize(path.posix.join(base, decodeURIComponent(href)))); } catch (_) { /* Invalid URL: do not suppress a candidate. */ }
    }
  });
  return links;
}
for (const page of pages) {
  const seen = new Map();
  const linked = linkedTargets(page);
  let fence = null, htmlBlock = false;
  const lines = page.body.split(/\r?\n/);
  // Front matter length provides original file line numbers.
  const offset = fs.readFileSync(page.file, 'utf8').split(/\r?\n/).length - lines.length;
  lines.forEach((line, index) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; return; }
    if (fence || /^\s{4}/.test(line) || /^\s*\[[^\]]+\]:/.test(line)) return;
    if (/^\s*<!--/.test(line)) htmlBlock = true;
    if (htmlBlock) { if (line.includes('-->')) htmlBlock = false; return; }
    function walk(tokens) {
      for (const token of tokens) {
        if (['link', 'image', 'codespan', 'html', 'escape'].includes(token.type)) continue;
        if (token.tokens) { walk(token.tokens); continue; }
        if (token.type !== 'text') continue;
        for (const match of token.text.matchAll(pattern)) {
          const term = match[0];
          // A sequence-9 title often also names its pathway. When the following
          // text explicitly says 途径, prefer the matching pathway overview.
          const after = token.text.slice(match.index + term.length);
          const pathway = /^(?:[”’」』])?途径/.test(after)
            ? (names.get(term + '途径') || []).filter(p => /\/worldview\/pathways\//.test(p.file)) : [];
          const allTargets = (pathway.length === 1 ? pathway : names.get(term)).filter(p => p.file !== page.file);
          const targets = allTargets.filter(p => !linked.has(normalize(p.url)));
          if (!targets.length || rejected.has(reviewKey(page.file, term, allTargets, line))) continue;
          const key = term + '\0' + allTargets.map(p => p.file).join('\0');
          const prev = seen.get(key);
          if (prev) { prev.count++; continue; }
          seen.set(key, { term, targets, ambiguous: allTargets.length > 1, count: 1, line: index + offset + 1, excerpt: line.trim() });
        }
      }
    }
    walk(Lexer.lexInline(line));
  });
  const summaryParts = eventSummaryParts({event_summary: page.summary, event_summary_links: page.summaryLinks})
    .filter(part => part.target);
  const summaryTargets = new Set(summaryParts.map(part => normalize(part.target)));
  for (const candidate of seen.values()) {
    const summaryCovered = page.brief && candidate.targets.every(target => summaryTargets.has(normalize(target.url)));
    const status = page.brief ? (summaryCovered ? '简记摘要已有目标' : '简记正文未发布') : candidate.ambiguous ? '同名歧义' : '待核对';
    rows.push([relative(page.file), candidate.line, candidate.term, status, candidate.targets.map(p => relative(p.file)).join(' | '), candidate.count, candidate.excerpt]);
    // The same event may use a shortened name or omit title quotation marks.
    // These are review suggestions, not proof of identity.
    if (page.brief && !summaryCovered && !candidate.ambiguous && candidate.targets.length === 1) {
      const variants = candidate.term.includes('·') ? candidate.term.split('·') : [];
      const unquoted = candidate.term.replace(/^[“‘「『]|[”’」』]$/g, '');
      if (unquoted !== candidate.term) variants.push(unquoted);
      const summaryLine = fs.readFileSync(page.file, 'utf8').split(/\r?\n/).findIndex(line => /^event_summary:/.test(line)) + 1;
      const summarySource = fs.readFileSync(page.file, 'utf8').split(/\r?\n/)[summaryLine - 1] || '';
      for (const short of new Set(variants)) {
        const knownAliases = aliasTargets.get(short);
        const alreadySuggested = knownAliases && knownAliases.size === 1 && knownAliases.has(normalize(candidate.targets[0].url));
        if (short.length >= 2 && !alreadySuggested && !names.has(short) && page.summary.includes(short) && !page.summary.includes(candidate.term) &&
            !summaryParts.some(link => link.text.includes(short)) &&
            !rejected.has(reviewKey(page.file, short, candidate.targets, summarySource))) {
          rows.push([relative(page.file), summaryLine, short, '简记摘要简称待核对', relative(candidate.targets[0].file), 1, page.summary]);
        }
      }
    }
  }
  if (page.brief) {
    const summarySeen = new Map();
    const linkedSummary = summaryTargets;
    const summarySourceLines = fs.readFileSync(page.file, 'utf8').split(/\r?\n/);
    const summaryLine = summarySourceLines.findIndex(line => /^event_summary:/.test(line)) + 1;
    for (const match of page.summary.matchAll(pattern)) {
      const term = match[0];
      const after = page.summary.slice(match.index + term.length);
      const pathway = /^(?:[”’」』])?途径/.test(after)
        ? (names.get(term + '途径') || []).filter(p => /\/worldview\/pathways\//.test(p.file)) : [];
      const allTargets = (pathway.length === 1 ? pathway : names.get(term)).filter(p => p.file !== page.file);
      const targets = allTargets.filter(p => !linkedSummary.has(normalize(p.url)));
      if (!targets.length || rejected.has(reviewKey(page.file, term, allTargets, summarySourceLines[summaryLine - 1] || ''))) continue;
      const key = term + '\0' + allTargets.map(p => p.file).join('\0');
      const prev = summarySeen.get(key);
      if (prev) { prev.count++; continue; }
      summarySeen.set(key, { term, targets, ambiguous: allTargets.length > 1, count: 1 });
    }
    for (const candidate of summarySeen.values()) rows.push([relative(page.file), summaryLine, candidate.term, candidate.ambiguous ? '简记摘要同名歧义' : '简记摘要待核对', candidate.targets.map(p => relative(p.file)).join(' | '), candidate.count, page.summary]);
    for (const [alias, urls] of aliasTargets) {
      if (names.has(alias) || urls.size !== 1 || !page.summary.includes(alias)) continue;
      const url = [...urls][0];
      const targets = pagesByUrl.get(url) || [];
      if (targets.length !== 1 || targets[0].file === page.file || linkedSummary.has(url)) continue;
      // Do not propose a substring inside an explicitly linked longer label.
      if (summaryParts.some(link => link.text.includes(alias))) continue;
      if (rejected.has(reviewKey(page.file, alias, targets, summarySourceLines[summaryLine - 1] || ''))) continue;
      rows.push([relative(page.file), summaryLine, alias, '简记摘要别名待核对', relative(targets[0].file), 1, page.summary]);
    }
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
const clean = value => String(value).replace(/[\t\r\n]+/g, ' ');
fs.writeFileSync(output, '\ufeff' + [['来源文件', '行号', '匹配标题', '状态', '候选目标文件', '出现次数', '原文摘录'], ...rows].map(row => row.map(clean).join('\t')).join('\n') + '\n');
console.log(`扫描 ${pages.length} 个页面，生成 ${rows.length} 条候选：${output}`);
const counts = new Map();
for (const row of rows) counts.set(row[3], (counts.get(row[3]) || 0) + 1);
for (const [status, count] of counts) console.log(`${status}：${count} 条`);
