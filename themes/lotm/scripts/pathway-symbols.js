const fs = require('fs');
const path = require('path');
const { pathwayPalette } = require('../../../source/relationships/pathway-palette');
function colorVars(page) {
  const name = String(page.title || '').replace(/途径$/, '');
  const colors = pathwayPalette[name];
  if (!colors) throw new Error(`途径缺少共享配色：${page.title}`);
  for (const color of [colors.day, colors.night]) if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`途径配色无效：${page.title}`);
  return `--pathway-day:${colors.day};--pathway-night:${colors.night}`;
}
// Symbol credits are plain provenance text; never derive a link from a post number.
function symbolSource(page) {
  const value = page.pathway_symbol_source;
  if (value === undefined && !page.pathway_symbol) return '';
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]|(?:https?:\/\/|www\.|(?:javascript|data|vbscript):|(?:m\.)?weibo\.cn(?:\/|$))/i.test(value)) throw new Error(`途径标志出处必须为非空纯文字，不含外链：${page.title}`);
  return value.trim();
}
function symbol(page, hexo) {
  if (!page.pathway_symbol) return '';
  if (!/^\/images\/pathways\/[^/]+\.svg$/.test(page.pathway_symbol)) throw new Error(`途径标志无效：${page.title}`);
  symbolSource(page);
  const svg = fs.readFileSync(path.join(hexo.source_dir, page.pathway_symbol.slice(1)), 'utf8');
  if (/<(?:image|script|foreignObject)\b|\bon\w+=|(?:href|src)=/i.test(svg) || !svg.includes('<path ') || !svg.includes('viewBox=')) throw new Error(`途径标志必须为独立矢量路径：${page.title}`);
  return svg.replace(/<title>[\s\S]*?<\/title>/, '').replace('<svg ', `<svg class="pathway-symbol" style="${colorVars(page)}" aria-hidden="true" focusable="false" `);
}
hexo.extend.helper.register('pathway_symbol', function (page) { return symbol(page, hexo); });
hexo.extend.helper.register('pathway_color_vars', colorVars);
hexo.extend.helper.register('pathway_symbol_source', symbolSource);
hexo.extend.filter.register('before_generate', function () {
  for (const page of this.locals.get('pages').toArray()) {
    if (page.pathway_page) colorVars(page);
    if (page.pathway_symbol) symbol(page, this);
  }
});
hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('class="pathway-groups"')) return html;
  const pages = new Map(this.locals.get('pages').toArray().filter(p => p.pathway_symbol).map(p => [p.title, p]));
  return html.replace(/<table class="pathway-groups">[\s\S]*?<\/table>/g, table => {
    table = table.replace(/(<thead><tr><th[^>]*>[\s\S]*?<\/th>)/, `$1<th scope="col" class="pathway-symbol-cell">${this.theme.i18n.__(this.config.language)('pathway_symbol_label')}</th>`);
    return table.replace(/<td><a href="([^"]+)">([^<]+途径)<\/a><\/td>/g, (all, href, title) => {
      const page = pages.get(title);
      return `<td class="pathway-symbol-cell">${page ? symbol(page, this) : ''}</td>${all}`;
    });
  });
});
