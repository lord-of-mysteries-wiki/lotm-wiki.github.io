const clean = html => html.replace(/<a\b[^>]*class="headerlink"[^>]*>[\s\S]*?<\/a>/g, '');
const text = html => html.replace(/<[^>]*>/g, '').trim();
const chunks = html => clean(html).split(/(?=<h2\b)/).map(html => {
  const m = /^<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html);
  return { title: m ? text(m[1]) : '', body: m ? html.slice(m[0].length) : html };
});
function buildPathwayView(page, sequences, sourceLabel = '来源') {
  const refs = [];
  const add = (html, scope) => {
    html = html.trim().replace(/^来源：/, '');
    const urls = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    // A single author's article has one bibliography entry, with all applications retained.
    const key = urls.length === 1 && urls[0].includes('mp.weixin.qq.com') ? urls[0] : text(html);
    let ref = refs.find(r => r.key === key);
    if (!ref) { ref = { key, html, scopes: new Set() }; refs.push(ref); }
    ref.scopes.add(scope);
    return refs.indexOf(ref) + 1;
  };
  const inline = (html, scope) => html.replace(/（来源：([\s\S]*?)）/g, (_, source) => {
    const n = add(source, scope);
    return `<a class="pathway-citation" href="#pathway-source-${n}" aria-label="${sourceLabel} ${n}">[${n}]</a>`;
  });
  const body = [];
  for (const sequence of sequences) {
    const level = sequence['sequence-level'];
    const scope = `序列${level} ${sequence['sequence-name']}`;
    const missingRitual = /作者(?:此篇未列出该序列的晋升仪式。|该篇配方未列出本序列的晋升仪式。)/.test(text(sequence.content));
    const sections = [];
    for (let { title, body: html } of chunks(sequence.content)) {
      if (!title) continue; // Original return navigation is replaced by shared breadcrumbs.
      if (title === '来源' || title === '来源与待补资料') {
        html.replace(/<li>([\s\S]*?)<\/li>/g, (_, source) => {
          source = source.trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1');
          const m = /^\s*<strong>(.*?)<\/strong>：([\s\S]*)$/.exec(source);
          add(m ? m[2] : source, scope + '：' + (m ? (missingRitual ? text(m[1]).replace('、晋升仪式条件', '（未列晋升仪式）').replace('晋升仪式条件', '晋升仪式（该文未列出）') : text(m[1]).replace('晋升仪式条件', '晋升仪式')) : '序列名称对照'));
          return '';
        });
        continue;
      }
      if (title === '概览') {
        html = html.replace(/^\s*<p><strong>[\s\S]*?<\/p>/, '');
        title = '';
      }
      if (/^(具体能力待核实。|仪式要求待核实。)$/.test(text(html))) continue;
      html = html.replace(/<p>来源：([\s\S]*?)<\/p>/g, (_, source) => { add(source, scope + '：' + title); return ''; });
      // Absence of an author ritual is a source limitation, not a statement that none is required.
      if (/^作者(?:此篇未列出该序列的晋升仪式。|该篇配方未列出本序列的晋升仪式。)$/.test(text(html))) {
        continue;
      }
      html = inline(html, scope + '：' + (title || '名称与别名'));
      if (!text(html)) continue;
      html = html.replace(/id="([^"]+)"/g, `id="sequence-${level}-$1"`)
        .replace(/href="#([^"]+)"/g, (m, id) => id.startsWith('pathway-source-') ? m : `href="#sequence-${level}-${id}"`);
      const rendered = (title ? `<h3>${title}</h3>` : '') + html;
      sections.push(rendered);
    }
    body.push({ level, name: sequence['sequence-name'], html: sections.join('\n') });
  }
  let intro = '', tail = '';
  for (const { title, body: html } of chunks(page.content)) {
    if (title === '序列阶梯') continue;
    if (title === '来源' || title === '来源与待补资料' || title === '资料来源与待核对内容') {
      html.replace(/<li>([\s\S]*?)<\/li>/g, (_, source) => { add(source, source.includes('序列名称与能力') ? '序列名称与能力' : '途径资料'); return ''; });
    } else if (!title || title === '概览') {
      intro += inline(html.replace(/<p>\s*<a[^>]*>返回[\s\S]*?<\/p>/, ''), '途径概览');
    } else if (!html.includes('人物及其所处时期待核实。')) tail += `<h2>${title}</h2>${inline(html, title)}`;
  }
  return { intro, sequences: body, tail, references: refs.map(r => ({html: r.html, scopes: summarizeScopes([...r.scopes])})) };
}
function summarizeScopes(scopes) {
  const groups = new Map(), others = [];
  for (const scope of scopes) {
    const m = /^序列(\d) [^：]+：(.*)$/.exec(scope);
    if (!m) { others.push(scope); continue; }
    if (!groups.has(m[2])) groups.set(m[2], []);
    groups.get(m[2]).push(Number(m[1]));
  }
  for (const [kind, levels] of groups) {
    const sorted = [...new Set(levels)].sort((a,b) => b-a);
    const ranges = [];
    for (let i=0; i<sorted.length; i++) {
      const start = sorted[i]; let end = start;
      while (i+1<sorted.length && sorted[i+1]===end-1) end=sorted[++i];
      ranges.push(start===end ? String(start) : `${start}至${end}`);
    }
    others.push(`序列${ranges.join('、')}：${kind}`);
  }
  return others;
}
module.exports = { buildPathwayView, summarizeScopes };
