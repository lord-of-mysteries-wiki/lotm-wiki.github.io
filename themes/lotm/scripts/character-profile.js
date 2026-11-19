const { stripHTML, unescapeHTML } = require('hexo-util');

hexo.extend.helper.register('character_has_section', function (html, section) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp('<h2\\s+id="' + escaped + '"[^>]*>[\\s\\S]*?</h2>', 'i');
  const match = heading.exec(html || '');
  if (!match) return false;
  const remainder = html.slice(match.index + match[0].length);
  const body = remainder.split(/<h2(?:\s|>)/i, 1)[0];
  return unescapeHTML(stripHTML(body)).trim().length > 0;
});
