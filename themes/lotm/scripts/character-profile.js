const { stripHTML, unescapeHTML } = require('hexo-util');

// Basic facts are derived from the same reviewed text as the article, so an
// edit to a character's sources cannot silently leave the sidebar outdated.
hexo.extend.helper.register('character_section_text', function (html, section) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp('<h2\\s+id="' + escaped + '"[^>]*>[\\s\\S]*?</h2>', 'i');
  const match = heading.exec(html || '');
  if (!match) return '';
  const remainder = html.slice(match.index + match[0].length);
  const body = remainder.split(/<h2(?:\s|>)/i, 1)[0];
  return unescapeHTML(stripHTML(body.replace(/<\/(?:li|p|tr)\s*>/gi, '\n').replace(/<\/(?:td|th)\s*>/gi, ' · ')))
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n');
});
