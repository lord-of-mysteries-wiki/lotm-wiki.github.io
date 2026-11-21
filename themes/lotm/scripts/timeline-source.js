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
      const chapters = segment.match(/第[\d一二三四五六七八九十百零〇、,，—–至\-\s]+章(?:\s*[-—–至]\s*第?[\d一二三四五六七八九十百零〇]+章)?/g);
      if (!chapters) return work + '第' + volume[1] + '卷' + segment.trim().replace(/[、，,及]+$/, '');
      return work + '第' + volume[1] + '卷' + chapters.map(chapter => chapter.replace(/\s+/g, '').replace(/[—–]/g, '–')).join('、');
    });
    const prefix = /事件\s*[：:]/.test(part) ? '事件：' : '';
    return prefix + entries.join('；');
  }).join('；');
});
