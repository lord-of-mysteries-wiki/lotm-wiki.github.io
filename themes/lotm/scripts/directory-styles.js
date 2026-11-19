const fs = require('node:fs/promises');
const path = require('node:path');

let directoryStyles;
hexo.extend.filter.register('before_generate', async function () {
  const themeStyles = path.join(this.theme_dir, 'source/css/styles.styl');
  const common = ['site-navigation', 'typography', 'character-profile'];
  const sheets = await Promise.all([
    this.render.render({ path: themeStyles }),
    ...common.map(name => fs.readFile(path.join(this.source_dir, 'css', name + '.css'), 'utf8'))
  ]);
  directoryStyles = sheets.join('\n');
});

hexo.extend.helper.register('directory_styles', () => directoryStyles);
