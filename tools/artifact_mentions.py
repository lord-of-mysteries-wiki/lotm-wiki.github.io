"""按章节列出物品名及封印编号的字面命中，供核读时定位。"""
import re
from collections import Counter
from corpus_review import BOOKS, iter_chapters

NAMES = """
厄运布偶 变异的太阳圣徽 阿勒苏霍德之笔 女神的凝望 安提哥努斯家族笔记
安提哥努斯家族的笔记 幽蓝复仇者 猎魔子弹 蠕动的饥饿 太阳胸针 生物毒素瓶
海神权杖 阿兹克铜哨 莱曼诺的旅行笔记 莱曼诺旅行笔记 无暗十字 神灯
格罗塞尔游记 昨日重现 星之杖 特伦索斯特黄铜书 魔镜阿罗德斯 阿罗德斯 全黑之眼 万能钥匙 “黑皇帝”牌
""".split()
pattern = re.compile(r'(?<![0-9-])[0-3]-[0-9]{2,4}(?![0-9-])|' +
                     '|'.join(map(re.escape, sorted(NAMES, key=len, reverse=True))))

if __name__ == '__main__':
    _, path, encoding = BOOKS[0]
    print('# 《诡秘之主》逐章物品检索表\n')
    print('按本地精校本分章。数字为该章正文内所列写法的字面次数。'
          '编号、别名和同名词需结合语境核对。空行以“—”表示未命中当前词表。')
    last = None
    for volume, chapter, body in iter_chapters(path, encoding):
        if volume != last:
            print(f'\n## {volume}\n\n| 章节 | 写法与次数 |\n| --- | --- |')
            last = volume
        counts = Counter(pattern.findall(body))
        hits = '、'.join(f'{name} × {count}' for name, count in counts.items())
        print(f'| {chapter} | {hits or "—"} |')
