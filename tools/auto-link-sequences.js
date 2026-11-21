#!/usr/bin/env node
// Link recognized wiki entities; run without --apply to preview.
const fs = require('fs');
const path = require('path');
const fm = require('hexo-front-matter');
const { Lexer } = require('marked');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'source');
const apply = process.argv.includes('--apply');
const staged = process.argv.includes('--check-staged');
if (apply && staged) throw new Error('--apply 和 --check-staged 不能同时使用');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);
let stagedFiles = new Set();
let inputFiles;
if (staged) {
  const git = (...args) => execFileSync('git', args, { cwd: root });
  const tracked = git('ls-files', '--cached', '-z', '--', 'source/').toString('utf8').split('\0').filter(x => x.endsWith('.md'));
  stagedFiles = new Set(git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z', '--', 'source/').toString('utf8').split('\0').filter(Boolean));
  const input = tracked.map(name => `:${name}\n`).join('');
  const data = execFileSync('git', ['cat-file', '--batch'], { cwd: root, input, maxBuffer: 128 * 1024 * 1024 });
  let offset = 0;
  inputFiles = tracked.map(name => {
    const end = data.indexOf(10, offset);
    const header = data.subarray(offset, end).toString();
    const size = Number(header.split(' ').pop());
    if (!Number.isSafeInteger(size)) throw new Error(`无法读取暂存文件: ${name}`);
    offset = end + 1;
    const raw = data.subarray(offset, offset + size).toString('utf8');
    offset += size + 1;
    return { file: path.join(root, name), raw };
  });
} else inputFiles = files(source).sort().map(file => ({file, raw: fs.readFileSync(file, 'utf8')}));
const pages = inputFiles.map(({file, raw}) => {
  const data = fm.parse(raw);
  const relative = path.relative(source, file).split(path.sep).join('/');
  const url = String(data.permalink || relative.replace(/index\.md$/, '').replace(/\.md$/, '.html'));
  return { file, raw, data, relative, url };
});
const sequences = new Map(), pathways = new Map(), people = new Map(), organizations = new Map(), countries = new Map(), artifacts = new Map();
const nonArtifactTitles = new Set(pages.filter(p => /^(characters\/entries|worldview\/(?:pathways|organizations|countries))\//.test(p.relative)).map(p => String(p.data.title || '').trim().replace(/^[“「『]|[”」』]$/g, '')));
function addArtifact(term, page) {
  if (!term || term.length < 2) return;
  const targets = artifacts.get(term) || [];
  if (!targets.includes(page)) targets.push(page);
  artifacts.set(term, targets);
}
for (const page of pages) {
  if (/^artifacts\/entries\/[^/]+\.md$/.test(page.relative)) {
    const title = String(page.data.title || '').trim();
    const filename = path.basename(page.relative, '.md');
    if (/^[0-3]-\d{2,4}$/.test(filename)) addArtifact(filename, page);
    if (/^“[^”]+”(?:（“[^”]+”）)?$/.test(title)) {
      for (const match of title.matchAll(/“([^”]+)”/g)) addArtifact(match[1], page);
    } else if (/^“[^”]+”[^（）]+$/.test(title)) addArtifact(title, page);
    const plain = title.replace(/（(?:暂称|暂定名|待核实)）/g, '').trim();
    if (!/[（）“”《》]/.test(plain) && plain.length >= 4) addArtifact(plain, page);
    if (/^《[^》]+》$/.test(title)) addArtifact(title, page);
  }
  if (page.relative.startsWith('characters/entries/')) {
    const name = String(page.data.title || '').trim();
    if (/^[\p{Script=Han}]{2,}·[\p{Script=Han}·]{1,}$/u.test(name)) {
      if (!people.has(name)) people.set(name, []);
      people.get(name).push(page);
    }
  }
  if (/^worldview\/organizations\/[^/]+\/index\.md$/.test(page.relative)) {
    const name = String(page.data.title || '').trim();
    if (name.length >= 3) organizations.set(name, [...(organizations.get(name) || []), page]);
  }
  if (/^worldview\/countries\/entries\/[^/]+\.md$/.test(page.relative)) {
    const name = String(page.data.title || '').trim();
    if (name.length >= 3) countries.set(name, [...(countries.get(name) || []), page]);
  }
  if (!page.relative.startsWith('worldview/pathways/')) continue;
  const match = page.relative.match(/^worldview\/pathways\/([^/]+)\/序列([0-9])-([^/]+)\.md$/);
  if (match && String(page.data['sequence-name']) === match[3] && String(page.data['sequence-level']) === match[2]) {
    const key = `${match[2]}\0${match[3]}`;
    if (!sequences.has(key)) sequences.set(key, []);
    sequences.get(key).push(page);
  } else if (/^worldview\/pathways\/([^/]+)\/\1\.md$/.test(page.relative)) {
    const name = String(page.data.title || '').trim();
    if (name.endsWith('途径')) {
      if (!pathways.has(name)) pathways.set(name, []);
      pathways.get(name).push(page);
    }
  }
}
// 简称只映射到明确指定的物品文件；同名候选仍由唯一性检查拦截。
const artifactAliases = {
  '0-08': '0-08.md', '阿勒苏霍德之笔': '0-08.md',
  '许愿神灯': '0-05.md', '神灯': '0-05.md',
  '变异的太阳圣徽': '3-0782.md', '太阳圣徽': '3-0782.md',
  '厄运布偶': '3-0625.md', '通灵者镜子': '3-0217.md', '通灵者的镜子': '3-0217.md',
  '莱曼诺旅行笔记': '莱曼诺的旅行笔记.md', '旅行笔记': '莱曼诺的旅行笔记.md',
  '阿兹克铜哨': '阿兹克铜哨.md', '海神权杖': '海神权杖.md',
  '魔镜阿罗德斯': '2-111.md', '阿罗德斯': '2-111.md'
};
for (const [alias, filename] of Object.entries(artifactAliases)) {
  const target = pages.find(p => p.relative === `artifacts/entries/${filename}`);
  if (target) addArtifact(alias, target);
}
// 常见简称只在明确维护且全名唯一时使用；其他简称留给建议清单。
const aliases = new Map(Object.entries({
  '克莱恩': '克莱恩·莫雷蒂', '奥黛丽': '奥黛丽·霍尔',
  '阿尔杰': '阿尔杰·威尔逊', '佛尔思': '佛尔思·沃尔',
  '伦纳德': '伦纳德·米切尔', '埃姆林': '埃姆林·怀特',
  '戴里克': '戴里克·伯格', '卢米安': '卢米安·李'
}));
for (const [alias, name] of aliases) {
  const targets = people.get(name);
  if (targets && targets.length === 1 && !people.has(alias)) people.set(alias, targets);
}
const pathwayTerms = [...pathways.keys()].sort((a,b) => b.length - a.length);
const escaped = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const personTerms = [...people.keys()].sort((a,b) => b.length - a.length);
const organizationTerms = [...organizations.keys()];
const countryTerms = [...countries.keys()].sort((a,b) => b.length - a.length);
const artifactTerms = [...artifacts.keys()].sort((a,b) => b.length - a.length);
const re = new RegExp('序列\\s*([0-9])\\s*[“「『]([^”」』\\n]+)[”」』]' + (artifactTerms.length ? '|[“「『](?:' + artifactTerms.map(escaped).join('|') + ')[”」』]|' + artifactTerms.filter(s => s.length >= 4 || /^[0-3]-\d{2,4}$/.test(s) || /^《/.test(s)).map(escaped).join('|') : '') + (pathwayTerms.length ? '|' + pathwayTerms.map(escaped).join('|') : '') + (personTerms.length ? '|' + personTerms.map(escaped).join('|') : '') + (organizationTerms.length ? '|' + organizationTerms.map(escaped).join('|') : '') + (countryTerms.length ? '|' + countryTerms.map(escaped).join('|') : ''), 'gu');
let changedFiles = 0, changedLinks = 0;
for (const page of pages) {
  if (staged && !stagedFiles.has('source/' + page.relative)) continue;
  if (page.data.timeline_event || !/^(characters\/entries|artifacts\/entries|worldview)\//.test(page.relative)) continue;
  const separator = page.raw.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/);
  if (!separator) continue;
  const head = separator[0], body = page.raw.slice(head.length);
  const base = page.url.endsWith('/') ? page.url : path.posix.dirname(page.url) + '/';
  const already = new Set();
  // Count existing relative links so a page does not repeatedly link the same target.
  require('marked').walkTokens(require('marked').lexer(body), token => {
    if (token.type !== 'link' || !token.href || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(token.href)) return;
    try { already.add(path.posix.normalize(path.posix.join(base, decodeURIComponent(token.href.split(/[?#]/)[0]))).replace(/\/$/, '')); } catch (_) {}
  });
  let fence = null, comment = false, count = 0;
  const lines = body.split(/(?<=\n)/);
  const output = lines.map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; return line; }
    if (fence || /^\s{4}/.test(line) || /^\s*(?:#|\[[^\]]+\]:|<)/.test(line) || /<!--|-->/.test(line) || comment) {
      if (line.includes('<!--') && !line.includes('-->')) comment = true;
      if (line.includes('-->')) comment = false;
      return line;
    }
    let inlineOffset = 0;
    return Lexer.lexInline(line).map(token => {
      const tokenOffset = inlineOffset;
      inlineOffset += token.raw.length;
      if (token.type !== 'text' || token.raw !== token.text) return token.raw;
      return token.raw.replace(re, (whole, level, name, offset, text) => {
        // Chapter headings are citations, not mentions of their title words.
        // Titles follow a chapter number and a space in the current format.
        const prefix = line.slice(0, tokenOffset + offset);
        if (/第\d+章\s+[^，。；\n]*$/u.test(prefix)) return whole;
        const artifactName = /^[“「『].*[”」』]$/u.test(whole) ? whole.slice(1, -1) : whole;
        const artifactTargets = artifacts.get(artifactName);
        if (artifactTargets && /^[0-3]-\d{2,4}$/.test(artifactName) && (/[\d-]/.test(text[offset - 1] || '') || /[\d-]/.test(text[offset + whole.length] || ''))) return whole;
        if (level === undefined && people.has(whole)) {
          const before = text.slice(0, offset), after = text.slice(offset + whole.length);
          if (/^(?:[·\p{Script=Han}]*·|家族|途径|陵墓)/u.test(after) || before.lastIndexOf('《') > before.lastIndexOf('》')) return whole;
        }
        const others = level === undefined ? (pathways.get(whole) || people.get(whole) || organizations.get(whole) || countries.get(whole)) : null;
        const ambiguousName = nonArtifactTitles.has(artifactName) || pathways.has(artifactName) || people.has(artifactName) || organizations.has(artifactName) || countries.has(artifactName);
        if (artifactTargets && (others || ambiguousName)) return whole;
        const targets = level === undefined ? (artifactTargets || others) : sequences.get(`${level}\0${name}`);
        if (!targets || targets.length !== 1) return whole;
        const target = targets[0];
        const normalized = path.posix.normalize(target.url).replace(/\/$/, '');
        if (target.file === page.file || (!organizations.has(whole) && already.has(normalized))) return whole;
        let href = path.posix.relative(base, target.url);
        if (!href) return whole;
        if (target.url.endsWith('/') && !href.endsWith('/')) href += '/';
        already.add(normalized); count++;
        if (level !== undefined) return whole.replace(name, `[${name}](${href})`);
        return `[${whole}](${href})`;
      });
    }).join('');
  }).join('');
  if (count) {
    changedFiles++; changedLinks += count;
    console.log(`${page.relative}\t${count}`);
    if (apply) fs.writeFileSync(page.file, head + output);
  }
}
if (staged) {
  console.log(`暂存内容中有 ${changedLinks} 处可自动添加的链接，涉及 ${changedFiles} 个文件。`);
  if (changedLinks) {
    console.error('请运行 node tools/auto-link-sequences.js --apply，检查结果后重新暂存；暂存区不会自动修改。');
    process.exitCode = 1;
  }
} else console.log(`${apply ? '已添加' : '预计添加'} ${changedLinks} 条链接，涉及 ${changedFiles} 个页面${apply ? '' : '；加 --apply 执行'}。`);
