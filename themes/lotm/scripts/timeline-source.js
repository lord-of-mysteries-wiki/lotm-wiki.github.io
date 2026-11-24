hexo.extend.helper.register('timeline_source', function (value) {
  const source = String(value || '').trim();
  let work = '';
  return source.split(/；|;/).map(part => {
    const book = part.match(/《([^》]+)》/);
    if (book) work = book[0];
    const volumes = [...part.matchAll(/第([一二三四五六七八九十百零〇\d]+)[部卷]/g)];
    if (!volumes.length) return part.trim();
    const entries = volumes.map((volume, index) => {
      const segment = part.slice(volume.index + volume[0].length, volumes[index + 1]?.index);
      const chapterPattern = /第\s*([\d一二三四五六七八九十百零〇]+)(?:\s*章?\s*[-—–至～~]\s*第?\s*([\d一二三四五六七八九十百零〇]+))?\s*章/g;
      const chapters = [...segment.matchAll(chapterPattern)];
      if (!chapters.length) return work + '第' + volume[1] + '卷' + segment.trim().replace(/[、，,及]+$/, '');
      const formatted = chapters.map(([, start, end]) => end ? `第${start}章–第${end}章` : `第${start}章`);
      return work + '第' + volume[1] + '卷' + formatted.join('、');
    });
    const prefix = /事件\s*[：:]/.test(part) ? '事件：' : '';
    return prefix + entries.join('；');
  }).join('；');
});
