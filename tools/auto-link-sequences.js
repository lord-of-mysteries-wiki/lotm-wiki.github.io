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
const sequences = new Map(), pathways = new Map(), people = new Map(), organizations = new Map(), countries = new Map(), artifacts = new Map(), creatures = new Map();
const nonArtifactTitles = new Set(pages.filter(p => /^(characters\/entries|worldview\/(?:pathways|organizations|countries))\//.test(p.relative)).map(p => String(p.data.title || '').trim().replace(/^[“「『]|[”」』]$/g, '')));
function addArtifact(term, page) {
  if (!term || term.length < 2) return;
  const targets = artifacts.get(term) || [];
  if (!targets.includes(page)) targets.push(page);
  artifacts.set(term, targets);
}
for (const page of pages) {
  if (page.data.creature_profile && page.relative.startsWith('creatures/entries/')) {
    const name = String(page.data.title || '').trim();
    if (name.length >= 3) creatures.set(name, [...(creatures.get(name) || []), page]);
  }
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
    if (/^[\p{Script=Han}]{2,}·[\p{Script=Han}·]{1,}$/u.test(name) || (/^[\p{Script=Han}]{3,}$/u.test(name) && !pages.some(other => other !== page && String(other.data.title || '').startsWith(name + '（')))) {
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
    if (name.length >= 2) countries.set(name, [...(countries.get(name) || []), page]);
  }
  if (!page.relative.startsWith('worldview/pathways/')) continue;
  const match = page.relative.match(/^worldview\/pathways\/([^/]+)\/序列([0-9])-([^/]+)\.md$/);
  if (match && String(page.data['sequence-name']) === match[3] && String(page.data['sequence-level']) === match[2]) {
    const parent = pages.find(p => p.data.pathway_page && p.relative === `worldview/pathways/${match[1]}/${match[1]}.md`);
    if (parent) page.url = `${parent.url}#sequence-${match[2]}`;
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
// 国家简称逐项核对现有国家页；不自动去掉“帝国／王国”，避免把人物或地貌当作国家。
const countryAliases = {
  '鲁恩': '鲁恩王国', '弗萨克': '弗萨克帝国',
  '因蒂斯共和国': '因蒂斯', '因蒂斯帝国': '因蒂斯',
  '费内波特王国': '费内波特', '拜朗王国': '拜朗帝国'
};
for (const [alias, title] of Object.entries(countryAliases)) {
  if (countries.has(title)) countries.set(alias, countries.get(title));
}
// 不含间隔号的正式姓名也可以链接；同名消歧页的简称不在这里自动展开。
for (const title of ['阿蒙', '亚当', '嘉德丽雅', '芙兰卡', '简娜', '莎伦', '马里奇',
  '达尼兹', '查拉图', '梅迪奇', '安提哥努斯', '阿曼妮西斯', '萨林格尔',
  '赫拉伯根', '列奥德罗', '奥赛库斯', '萨斯利尔', '纳斯特', '老尼尔']) {
  const targets = pages.filter(p => p.relative.startsWith('characters/entries/') && p.data.title === title);
  if (targets.length === 1) people.set(title, targets);
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
  '戴里克': '戴里克·伯格', '卢米安': '卢米安·李',
  '邓恩': '邓恩·史密斯', '阿兹克': '阿兹克·艾格斯',
  '蕾妮特': '蕾妮特·缇尼科尔', '科林': '科林·伊利亚特',
  '奥萝尔': '奥萝尔·李', '卢加诺': '卢加诺·托斯卡诺',
  '梅丽莎': '梅丽莎·莫雷蒂'
}));
for (const [alias, name] of aliases) {
  const targets = people.get(name);
  if (targets && targets.length === 1 && !people.has(alias)) people.set(alias, targets);
}
// 使用主档案中的正式显示名，不另填一份别名事实表；短称和称号仍需人工消歧。
for (const page of pages.filter(p => p.relative.startsWith('characters/entries/'))) {
  const name = page.data.graph_profile?.name;
  if (typeof name !== 'string' || !/^[\p{Script=Han}·]{3,}$/u.test(name) || name === page.data.title) continue;
  if (pages.some(other => other !== page && (other.data.title === name || String(other.data.title || '').startsWith(name + '（') || other.data.graph_profile?.name === name))) continue;
  const targets = people.get(name) || [];
  if (!targets.includes(page)) targets.push(page);
  people.set(name, targets);
}
const pathwayTerms = [...pathways.keys()].sort((a,b) => b.length - a.length);
const escaped = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const personTerms = [...people.keys()].sort((a,b) => b.length - a.length);
const organizationTerms = [...organizations.keys()].sort((a,b) => b.length - a.length);
const creatureTerms = [...creatures.keys()].sort((a,b) => b.length - a.length);
const countryTerms = [...countries.keys()].sort((a,b) => b.length - a.length);
const artifactTerms = [...artifacts.keys()].sort((a,b) => b.length - a.length);
// 跨类型按最长名称优先，避免人物简称遮住组织或物品的完整名称。
const literalTerms = [...new Set([...creatureTerms, ...pathwayTerms, ...personTerms,
  ...organizationTerms, ...countryTerms, ...artifactTerms.filter(s => s.length >= 4 || /^[0-3]-\d{2,4}$/.test(s) || /^《/.test(s))])].sort((a,b) => b.length - a.length);
const re = new RegExp('序列\\s*([0-9])\\s*[“「『]([^”」』\\n]+)[”」』]|' +
  '[“「『](?:' + artifactTerms.map(escaped).join('|') + ')[”」』]|' + literalTerms.map(escaped).join('|'), 'gu');

// 较长词条中的局部文字不是独立提及，例如“阿蒙家族”“鲁恩军方”。
const titles = [...new Set(pages.map(p => String(p.data.title || '').trim()))];
const containingTitles = new Map([...people.keys(), ...countries.keys()].map(term =>
  [term, titles.filter(title => title !== term && title.includes(term))]));
function embeddedName(term, text, offset) {
  if (term === '赫密斯' && text.slice(offset + term.length).startsWith('语')) return true;
  if (countries.has(term) && /^(?:语|语系|集团|公司)/u.test(text.slice(offset + term.length))) return true;
  return (containingTitles.get(term) || []).some(title => {
    const start = offset - title.indexOf(term);
    return start >= 0 && text.slice(start, start + title.length) === title;
  });
}
let changedFiles = 0, changedLinks = 0;
for (const page of pages) {
  if (staged && !stagedFiles.has('source/' + page.relative)) continue;
  // Scan every Markdown body, including events, creatures and directory pages.
  const separator = page.raw.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/);
  if (!separator) continue;
  let head = separator[0];
  const body = page.raw.slice(head.length);
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
        if (embeddedName(whole, text, offset)) return whole;
        const artifactName = /^[“「『].*[”」』]$/u.test(whole) ? whole.slice(1, -1) : whole;
        const artifactTargets = artifacts.get(artifactName);
        if (artifactTargets && /^[0-3]-\d{2,4}$/.test(artifactName) && (/[\d-]/.test(text[offset - 1] || '') || /[\d-]/.test(text[offset + whole.length] || ''))) return whole;
        if (level === undefined && people.has(whole)) {
          const before = text.slice(0, offset), after = text.slice(offset + whole.length);
          if (/^(?:[·\p{Script=Han}]*·|家族|途径|陵墓)/u.test(after) || before.lastIndexOf('《') > before.lastIndexOf('》')) return whole;
        }
        const others = level === undefined ? (pathways.get(whole) || people.get(whole) || organizations.get(whole) || countries.get(whole) || creatures.get(whole)) : null;
        const ambiguousName = nonArtifactTitles.has(artifactName) || pathways.has(artifactName) || people.has(artifactName) || organizations.has(artifactName) || countries.has(artifactName) || creatures.has(artifactName);
        if (artifactTargets && (others || ambiguousName)) return whole;
        const targets = level === undefined ? (artifactTargets || others) : sequences.get(`${level}\0${name}`);
        if (!targets || targets.length !== 1) return whole;
        const target = targets[0];
        const normalized = path.posix.normalize(target.url.split('#')[0]).replace(/\/$/, '');
        if (target.file === page.file || (!organizations.has(whole) && already.has(normalized))) return whole;
        const [targetPath, fragment] = target.url.split('#');
        let href = path.posix.relative(base, targetPath) + (fragment ? '#' + fragment : '');
        if (!href) return whole;
        if (target.url.endsWith('/') && !href.endsWith('/')) href += '/';
        already.add(normalized); count++;
        if (level !== undefined) return whole.replace(name, `[${name}](${href})`);
        return `[${whole}](${href})`;
      });
    }).join('');
  }).join('');
  if (page.data.timeline_event && page.data.event_summary) {
    const summary = String(page.data.event_summary);
    const links = [...(page.data.event_summary_links || [])];
    let added = 0;
    for (const match of summary.matchAll(re)) {
      const [whole, level, name] = match;
      if (embeddedName(whole, summary, match.index)) continue;
      const label = level === undefined ? whole : name;
      const candidates = level === undefined
        ? [pathways, people, organizations, countries, creatures, artifacts].flatMap(map => map.get(whole) || [])
        : (sequences.get(`${level}\0${name}`) || []);
      const unique = [...new Set(candidates)];
      if (unique.length !== 1 || unique[0].file === page.file) continue;
      if (people.has(whole) && /^(?:[·\p{Script=Han}]*·|家族|途径|陵墓)/u.test(summary.slice(match.index + whole.length))) continue;
      if (links.some(link => link.text.includes(label) || label.includes(link.text) || link.target === unique[0].url)) continue;
      links.push({text: label, target: unique[0].url}); added++;
    }
    if (added) {
      const field = 'event_summary_links: ' + JSON.stringify(links) + '\n';
      const existing = /^event_summary_links:[^\n]*(?:\n(?:[ \t]+[^\n]*|-[^\n]*))*(?:\n|$)/m;
      if (existing.test(head)) head = head.replace(existing, field);
      else head = head.replace(/---\s*\r?\n$/, field + '---\n');
      count += added;
    }
  }
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
