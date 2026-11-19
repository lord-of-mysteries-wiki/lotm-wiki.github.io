#!/usr/bin/env python3
"""Build a conservative character index from one copy of each novel."""
import json,re
from urllib.parse import quote
from corpus_review import BOOKS, iter_chapters
from pathlib import Path
root=Path(__file__).resolve().parents[1]
books=[('诡秘之主',root/'诡秘之主-原文/《诡秘之主》精校版全本.txt','utf-8'),('宿命之环',root/'宿命之环-原文/宿命之环++1到7部-第50章++暗藏的条件.txt','gb18030')]
# Names are manually curated; counts use the listed unambiguous written forms only.
candidates=[('klein','克莱恩·莫雷蒂','克莱恩','周明瑞','愚者与眷者'),('azik','阿兹克·艾格斯','阿兹克','','愚者与眷者'),('audrey','奥黛丽·霍尔','奥黛丽','','塔罗会'),('alger','阿尔杰·威尔逊','阿尔杰','','塔罗会'),('fors','佛尔思·沃尔','佛尔思','','塔罗会'),('derrick','戴里克·伯格','戴里克','','塔罗会'),('leonard','伦纳德·米切尔','伦纳德','','值夜者'),('dunn','邓恩·史密斯','邓恩','','值夜者'),('benson','班森·莫雷蒂','班森','','莫雷蒂一家'),('melissa','梅丽莎·莫雷蒂','梅丽莎','','莫雷蒂一家'),('amon','阿蒙','阿蒙','','其他人物'),('roselle','罗塞尔·古斯塔夫','罗塞尔','','其他人物'),('lumian','卢米安·李','卢米安','','宿命之环'),('aurore','奥萝尔·李','奥萝尔','','宿命之环'),('franca','芙兰卡','芙兰卡','','宿命之环'),('jenna','简娜','简娜','','宿命之环'),('anthony','安东尼·瑞德','安东尼','','宿命之环'),('ludwig','路德维希','路德维希','','宿命之环'),('krista','克丽丝泰尔','克丽丝泰尔','','宿命之环'),('susie','苏茜','苏茜','','其他人物'),('emlyn','埃姆林·怀特','埃姆林','','塔罗会'),('cattleya','嘉德丽雅','嘉德丽雅','','塔罗会'),('xio','休·迪尔查','休','休·迪尔查','塔罗会'),('gehrman','格尔曼·斯帕罗','格尔曼','格尔曼·斯帕罗','其他人物'),('sharron','莎伦','莎伦','','其他人物'),('maric','马里奇','马里奇','','其他人物'),('reinette','蕾妮特·缇尼科尔','蕾妮特','','其他人物'),('will','威尔·昂赛汀','威尔','威尔·昂赛汀','其他人物'),('adam','亚当','亚当','','其他人物'),('medici','梅迪奇','梅迪奇','','其他人物'),('pallez','帕列斯·索罗亚斯德','帕列斯','','其他人物'),('trissy','特莉丝','特莉丝','','其他人物'),('ince','因斯·赞格威尔','因斯','因斯·赞格威尔','其他人物'),('daley','戴莉·西蒙妮','戴莉','','值夜者'),('oldneil','老尼尔','老尼尔','','值夜者'),('rozanne','罗珊','罗珊','','值夜者'),('goddess','阿里安娜','阿里安娜','','其他人物'),('bernadette','贝尔纳黛','贝尔纳黛','','其他人物'),('danitz','达尼兹','达尼兹','','其他人物'),('anderson','安德森','安德森','','其他人物'),('george','乔治三世','乔治三世','','其他人物'),('sherlock','夏洛克·莫里亚蒂','夏洛克','夏洛克·莫里亚蒂','其他人物'),('dorian','多里安·格雷·亚伯拉罕','多里安','多里安·格雷','其他人物'),('arode','阿罗德斯','阿罗德斯','','其他人物'),('murphy','墨菲斯托','墨菲斯托','','宿命之环'),('termiboros','忒尔弥波洛斯','忒尔弥波洛斯','','宿命之环'),('pualis','普阿利斯','普阿利斯','','宿命之环'),('guillaume','纪尧姆·贝内','纪尧姆','','宿命之环'),('ryan','莱恩·科斯','莱恩','','宿命之环'),('valentine','瓦伦泰','瓦伦泰','','宿命之环'),('loki','洛基','洛基','','宿命之环'),('hugues','休格·阿图瓦','休格','','宿命之环')]
candidates.extend([('ikance', '伊康瑟', '伊康瑟', '', '值夜者'), ('lanervus', '兰尔乌斯', '兰尔乌斯', '', '其他人物'), ('megose', '梅高欧丝', '梅高欧丝', '', '其他人物'), ('hazel', '海柔尔', '海柔尔', '', '其他人物'), ('glaint', '格莱林特', '格莱林特', '', '其他人物'), ('ian', '伊恩', '伊恩', '', '其他人物'), ('essinger', '艾辛格', '艾辛格', '', '其他人物'), ('edessak', '埃德萨克', '埃德萨克', '', '其他人物'), ('edwina', '艾德雯娜·爱德华兹', '艾德雯娜', '', '其他人物'), ('frank', '弗兰克·李', '弗兰克', '', '其他人物'), ('senor', '塞尼奥尔', '塞尼奥尔', '', '其他人物'), ('hilaire', '希拉里昂', '希拉里昂', '', '其他人物'), ('zarath', '查拉图', '查拉图', '', '其他人物'), ('susanna', '苏珊娜·马蒂斯', '苏珊娜', '', '宿命之环'), ('amandina', '阿芒迪娜', '阿芒迪娜', '', '宿命之环'), ('magot', '马格特', '马格特', '', '宿命之环'), ('ost', '奥斯塔', '奥斯塔', '', '宿命之环'), ('omabella', '欧弥贝拉', '欧弥贝拉', '', '宿命之环')])
candidates.extend([('colin', '科林·伊利亚特', '科林', '', '其他人物'), ('lovia', '洛薇雅', '洛薇雅', '', '其他人物'), ('heath', '希斯·道尔', '希斯·道尔', '', '其他人物'), ('yann', '亚恩·考特曼', '亚恩·考特曼', '', '其他人物'), ('herwin', '赫温·兰比斯', '赫温', '', '其他人物'), ('qunas', '丘纳斯·科尔格', '丘纳斯', '', '其他人物'), ('talim', '塔利姆·杜蒙特', '塔利姆', '', '其他人物'), ('pierre', '皮埃尔·贝里', '皮埃尔·贝里', '', '宿命之环'), ('gardner', '加德纳·马丁', '加德纳·马丁', '', '宿命之环'), ('pons', '蓬斯·贝内', '蓬斯·贝内', '', '宿命之环'), ('celia', '切莉娅·贝洛', '切莉娅', '', '宿命之环'), ('charlotte', '夏绿蒂·卡尔维诺', '夏绿蒂', '', '宿命之环'), ('charlie', '查理·科伦特', '查理·科伦特', '', '宿命之环'), ('rato', '拉托·吉亚罗', '拉托·吉亚罗', '', '宿命之环'), ('voisin', '瓦赞·桑松', '瓦赞·桑松', '', '宿命之环'), ('montsouris', '蒙苏里', '蒙苏里', '', '宿命之环'), ('hugues_correct', '于格·阿图瓦', '于格·阿图瓦', '', '宿命之环')])
candidates.extend([('lugano', '卢加诺·托斯卡诺', '卢加诺', '', '宿命之环'), ('renthas', '伦塔司', '伦塔司', '', '宿命之环'), ('angouleme', '昂古莱姆·德·弗朗索瓦', '昂古莱姆', '', '宿命之环'), ('imre', '伊姆雷', '伊姆雷', '', '宿命之环'), ('norfi', '诺尔菲', '诺尔菲', '', '宿命之环'), ('camus', '加缪', '加缪', '', '宿命之环'), ('oldkohler', '老科勒', '老科勒', '', '其他人物'), ('elizabeth', '伊丽莎白', '伊丽莎白', '', '其他人物'), ('frye', '弗莱', '弗莱', '', '值夜者')])
candidates.extend([('amanises', '阿曼妮西斯', '阿曼妮西斯', '', '其他人物'), ('alhasson', '艾尔·哈森', '艾尔·哈森', '', '值夜者'), ('darkwill', '达克威尔', '达克威尔', '', '其他人物'), ('ouroboros', '乌洛琉斯', '乌洛琉斯', '', '其他人物'), ('acesnake', '艾斯·斯内克', '艾斯·斯内克', '', '其他人物'), ('bethel', '维尔杜·亚伯拉罕', '维尔杜', '', '其他人物'), ('alista', '亚利斯塔·图铎', '亚利斯塔', '', '其他人物'), ('herabergen', '赫拉伯根', '赫拉伯根', '', '其他人物'), ('sakota', '萨科塔', '萨科塔', '', '宿命之环'), ('lia', '莉雅', '莉雅', '', '宿命之环'), ('raymond', '雷蒙德·克莱格', '雷蒙德', '', '宿命之环'), ('ava', '阿娃', '阿娃', '', '宿命之环'), ('batna', '巴特纳·孔泰', '巴特纳', '', '宿命之环'), ('angelica', '安洁莉卡·巴雷哈特', '安洁莉卡', '', '其他人物')])
candidates.extend([('patrick', '帕特里克·杰森', '帕特里克·杰森', '', '其他人物'), ('shermane', '雪伦夫人', '雪伦夫人', '', '其他人物'), ('royking', '罗伊·金', '罗伊·金', '', '其他人物'), ('panatia', '潘娜蒂亚', '潘娜蒂亚', '', '其他人物'), ('juan', '胡安·奥罗', '胡安·奥罗', '', '宿命之环'), ('louis_lund', '路易斯·隆德', '路易斯·隆德', '', '宿命之环'), ('maurice', '莫里斯·贝内', '莫里斯·贝内', '', '宿命之环'), ('michel', '米歇尔·加里古', '米歇尔·加里古', '', '宿命之环'), ('naroka', '娜罗卡', '娜罗卡', '', '宿命之环'), ('arnold', '阿诺利', '阿诺利', '', '宿命之环'), ('kukva', '库克瓦', '库克瓦', '', '其他人物'), ('capim', '卡平', '卡平', '', '其他人物'), ('jason', '杰森·贝利亚', '杰森·贝利亚', '', '其他人物'), ('haines', '海纳斯·凡森特', '海纳斯·凡森特', '', '其他人物')])
candidates.extend([('grassis', '格拉西斯', '格拉西斯', '', '其他人物'), ('crestet', '克雷斯泰·塞西玛', '塞西玛', '', '值夜者'), ('heras', '赫拉斯', '赫拉斯', '', '其他人物'), ('nihbass', '尼拜斯', '尼拜斯', '', '其他人物'), ('liana', '莉亚娜·马赫特', '莉亚娜', '', '其他人物'), ('eve', '埃夫', '埃夫先生', '', '宿命之环')])
candidates.extend([('brignais', '布里涅尔男爵', '布里涅尔', '', '宿命之环'), ('elodie', '艾洛蒂', '艾洛蒂', '', '宿命之环'), ('fells', '费尔斯夫人', '费尔斯', '', '宿命之环'), ('misiri', '米西里', '米西里', '', '宿命之环'), ('black', '布莱克', '布莱克', '', '宿命之环'), ('christo', '克里斯托', '克里斯托', '', '宿命之环'), ('simon', '西蒙', '西蒙', '', '宿命之环'), ('kali', '卡利神甫', '卡利神甫', '', '宿命之环')])
candidates.append(('pierre_clegg','皮埃尔·克莱格','皮埃尔·克莱格','','宿命之环'))
candidates.append(('abscess_hand','脓肿断手','脓肿断手','','宿命之环'))
candidates.append(('thibaut_jacques','提伯特·雅克','提伯特','','宿命之环'))
candidates.extend([('meviti','麦维提','麦维提','','其他人物'),('skoll_pirate','斯考尔','斯考尔','','其他人物'),('huntley_pirate','亨特利','亨特利','','其他人物')])
candidates.extend([('ait_hammer','艾特','艾特','','宿命之环'),('harman_bald','哈曼','哈曼','','宿命之环'),('olsen_supervisor','奥尔森','奥尔森','','宿命之环'),('castina','卡斯蒂娜','卡斯蒂娜','','宿命之环'),('steve_wraith','史蒂夫','史蒂夫','','其他人物'),('enzo_winner','恩佐','恩佐','','其他人物')])
candidates.extend([('coshnam','高希纳姆','高希纳姆','','其他人物'),('yurisian','尤里斯安','尤里斯安','','其他人物'),('karaman','卡拉曼','卡拉曼','','其他人物'),('osaito','奥赛托','奥赛托','','宿命之环')])
candidates.extend([('bogda_jones','博格达·琼斯','博格达','','其他人物'),('wos_kent','乌斯·肯特','乌斯·肯特','','其他人物'),('jason_zombie','杰森','杰森','','其他人物'),('tyr_werewolf','泰尔','泰尔','','其他人物')])
candidates.extend([('pasha_beldan','帕莎','帕莎','','其他人物'),('roy_beldan','罗伊（贝尔丹）','罗伊','','其他人物'),('byers_beldan','拜尔斯（贝尔丹）','拜尔斯','','其他人物'),('phil_beldan','菲尔（贝尔丹）','菲尔','','其他人物')])
candidates.append(('chris_mana','克丽丝芒娜','克丽丝芒娜','','宿命之环'))
candidates.append(('anna_tingen','安娜（廷根）','安娜','','其他人物'))
candidates.extend([('harry_owl','哈里（猫头鹰）','哈里','','其他人物'),('richard_fate','瑞乔德','瑞乔德','','其他人物')])
candidates.extend([('kornley', '科恩黎·怀特', '科恩黎', '', '值夜者'), ('luoyao', '洛耀·莱汀', '洛耀', '', '值夜者'), ('seeka', '西迦·特昂', '西迦', '', '值夜者'), ('riel', '瑞尔·比伯', '瑞尔·比伯', '', '其他人物'), ('alfred', '阿尔弗雷德·霍尔', '阿尔弗雷德', '', '其他人物'), ('hibbert', '希伯特·霍尔', '希伯特', '', '其他人物'), ('welch', '韦尔奇·麦格文', '韦尔奇', '', '其他人物'), ('laurence', '劳伦斯·诺德', '劳伦斯', '', '其他人物'), ('naya', '娜娅', '娜娅', '', '其他人物'), ('dust', '达斯特·古德里安', '达斯特·古德里安', '', '其他人物')])
candidates.extend([('albus', '阿不思·梅迪奇', '阿不思', '', '宿命之环'), ('poufer', '普伊弗·索伦', '普伊弗', '', '宿命之环'), ('vermonda', '佛蒙达·香槟·索伦', '佛蒙达', '', '宿命之环')])
candidates.extend([('mike', '迈克·约瑟夫', '迈克·约瑟夫', '', '其他人物'), ('jurgen', '于尔根·库珀', '于尔根', '', '其他人物'), ('joyce', '乔伊斯·迈尔', '乔伊斯·迈尔', '', '其他人物'), ('waite', '韦特·希尔蒙', '韦特·希尔蒙', '', '其他人物'), ('archbishop_anthony', '安东尼·史蒂文森', '安东尼·史蒂文森', '', '其他人物'), ('sirius', '西里斯·阿瑞匹斯', '西里斯·阿瑞匹斯', '', '其他人物'), ('raft', '拉夫特·庞德', '拉夫特·庞德', '', '其他人物'), ('framy', '弗兰米·凯奇', '弗兰米·凯奇', '', '其他人物'), ('maipu', '迈普·迈尔', '迈普·迈尔', '', '宿命之环'), ('sibyl', '西比尔·贝里', '西比尔·贝里', '', '宿命之环')])
candidates.extend([('earl_hall', '霍尔伯爵', '霍尔伯爵', '', '其他人物'), ('allen', '艾伦·克瑞斯', '艾伦·克瑞斯', '', '其他人物'), ('mobet', '莫贝特·索罗亚斯德', '莫贝特', '', '其他人物'), ('pacheco', '帕切科·道恩', '帕切科', '', '其他人物'), ('repard', '雷帕德', '雷帕德', '', '其他人物'), ('maynard', '梅纳德', '梅纳德', '', '其他人物'), ('shatas', '夏塔丝', '夏塔丝', '', '其他人物'), ('snowman', '斯诺曼', '斯诺曼', '', '其他人物'), ('longzel', '龙泽尔', '龙泽尔', '', '其他人物'), ('gilchies', '吉尔希艾斯', '吉尔希艾斯', '', '其他人物'), ('daisy', '黛西', '黛西', '', '其他人物'), ('sherman', '谢尔曼', '谢尔曼', '', '其他人物')])
candidates.extend([('beost', '贝奥斯特', '贝奥斯特', '', '宿命之环'), ('madena', '马戴娜·贝内', '马戴娜', '', '宿命之环'), ('roche', '洛希·露易丝·桑松', '洛希·露易丝·桑松', '', '宿命之环'), ('julie', '朱莉', '朱莉', '', '宿命之环'), ('philippe', '菲利普', '菲利普', '', '宿命之环'), ('salistes', '莎莉丝特', '莎莉丝特', '', '宿命之环'), ('montserrat', '蒙塞拉特', '蒙塞拉特', '', '宿命之环'), ('guy', '格伊', '格伊', '', '宿命之环')])
candidates.extend([('hela', '海拉', '海拉', '', '宿命之环'), ('mister_k', 'K先生', 'K先生', '', '宿命之环'), ('black_scorpion', '罗杰', '黑蝎', '', '宿命之环'), ('riya', '瑞雅', '瑞雅', '', '宿命之环'), ('harrison', '哈里森', '哈里森', '', '宿命之环'), ('sasrir', '萨斯利尔', '萨斯利尔', '', '其他人物'), ('lilith', '莉莉丝', '莉莉丝', '', '其他人物'), ('badheir', '巴德海尔', '巴德海尔', '', '其他人物'), ('salinger', '萨林格尔', '萨林格尔', '', '其他人物')])
candidates.extend([('tracy_inn', '翠西', '翠西', '', '其他人物'), ('kelly_butler', '刻利', '刻利', '', '其他人物'), ('nast', '纳斯特', '纳斯特', '', '其他人物'), ('ademis', '阿德米索尔', '阿德米索尔', '', '其他人物'), ('ormir', '奥尔米尔', '奥尔米尔', '', '其他人物'), ('irene', '艾琳', '艾琳', '', '其他人物'), ('rosago', '罗萨戈', '罗萨戈', '', '其他人物'), ('bonova', '博诺瓦·古斯塔夫', '博诺瓦', '', '其他人物'), ('cheek', '奇克', '奇克', '', '其他人物'), ('joshua', '约书亚', '约书亚', '', '其他人物'), ('elland', '艾尔兰', '艾尔兰', '', '其他人物'), ('leomaster', '利奥马斯特', '利奥马斯特', '', '其他人物'), ('erhog', '艾瑞霍格', '艾瑞霍格', '', '其他人物'), ('laurent', '洛朗特', '洛朗特', '', '宿命之环'), ('herdsey', '赫德西', '赫德西', '', '宿命之环'), ('flameng', '弗拉芒', '弗拉芒', '', '宿命之环'), ('francesco', '弗朗切斯科', '弗朗切斯科', '', '宿命之环'), ('primpin', '普林皮诺', '普林皮诺', '', '宿命之环'), ('devaho', '德瓦霍·安德雷拉德', '德瓦霍', '', '宿命之环'), ('sallent', '萨连特·恩派亚', '萨连特', '', '宿命之环'), ('worms', '沃尔姆斯', '沃尔姆斯', '', '宿命之环'), ('grisha', '格里沙', '格里沙', '', '宿命之环')])
candidates.extend([('groselle','格罗塞尔','格罗塞尔','','其他人物'),('hermes','赫密斯','赫密斯','','其他人物')])
candidates.extend([('soest', '索斯特', '索斯特', '', '值夜者'), ('franky', '弗兰奇', '弗兰奇', '', '其他人物'), ('eslant', '伊思兰特·奥西斯莱卡', '伊思兰特', '', '其他人物'), ('lolotta', '洛络塔', '洛络塔', '', '值夜者'), ('cynthia', '辛西娅', '辛西娅', '', '其他人物'), ('vickrol', '维克罗尔', '维克罗尔', '', '其他人物'), ('clarisse', '克拉丽丝', '克拉丽丝', '', '宿命之环'), ('valerio', '瓦莱里奥', '瓦莱里奥', '', '宿命之环'), ('goodwill', '博诺·古德维尔', '古德维尔', '', '宿命之环')])
candidates.append(('bethel_abraham','伯特利·亚伯拉罕','伯特利','','其他人物'))
candidates.append(('bulman','布尔曼','布尔曼','魔鬼巫师','宿命之环'))
candidates.append(('helen_bulman','海伦','海伦','','宿命之环'))
candidates.append(('horamick','霍拉米克·海顿','霍拉米克','','其他人物'))
candidates.extend([('morane','莫兰·阿维尼','莫兰','','宿命之环'),('connors','康纳斯·维克托','康纳斯','','其他人物'),('kaspars','卡斯帕斯·坎立宁','卡斯帕斯','','其他人物'),('hal_constantine','哈尔·康斯坦丁','哈尔','','其他人物')])
candidates.extend([('bruce_walls','布鲁·沃尔斯','布鲁','','其他人物'),('class_kitz','克拉斯·基兹','克拉斯','','宿命之环'),('snalna','斯纳尔纳·艾因霍恩','斯纳尔纳','','宿命之环'),('travis','特拉维斯·埃弗瑞特','特拉维斯','','宿命之环')])
candidates.extend([('ailos','爱洛丝·艾因霍恩','爱洛丝','','宿命之环'),('delilah','黛利拉·勒罗伊','黛利拉','','宿命之环')])
candidates.extend([('niol','尼奥尔·贝斯特','尼奥尔','','宿命之环'),('fernandez','费南德兹·奥罗','费南德兹','','宿命之环'),('ivilista','伊维利斯塔·艾格斯','伊维利斯塔','','宿命之环'),('latizia','拉蒂西亚·多瑞拉','拉蒂西亚','','其他人物'),('radar','雷达尔·瓦伦丁','雷达尔','','其他人物')])
candidates.extend([('urdi','乌尔迪·布兰奇','乌尔迪','','其他人物'),('galis','加利斯·凯文','加利斯','','其他人物'),('windsor','温莎·贝林','温莎','','其他人物'),('okfa','奥克法·康纳克里斯','奥克法','','其他人物'),('louis_wien','路易斯·维恩','维恩','','其他人物'),('ernest','欧内斯·博雅尔','欧内斯','','其他人物')])
candidates.extend([('donna_branch','堂娜','堂娜','','其他人物'),('denton_branch','丹顿','丹顿','','其他人物'),('cleves','克里维斯','克里维斯','','其他人物'),('cecil_guard','塞西尔','塞西尔','','其他人物')])
candidates.append(('basil_pirate','罗勒','罗勒','拆骨者','宿命之环'))
candidates.extend([('hood_eugen','胡德·欧根','欧根','','其他人物'),('william_sykes','威廉·赛克斯','赛克斯','','其他人物'),('ael_moria','艾尔·莫瑞亚','莫瑞亚','','其他人物'),('bird_mustan','伯德·马斯坦','伯德','','其他人物')])
candidates.append(('mary_short','玛丽·肖特','玛丽','','其他人物'))
candidates.extend([('drag_gail','多拉古·盖尔','多拉古','','其他人物'),('erica_taylor','艾丽卡·泰勒','艾丽卡','','其他人物'),('luke_summer','卢克·萨默尔','卢克','','其他人物')])
candidates.extend([('sindras','辛德拉斯男爵','辛德拉斯','','其他人物'),('carlon','卡隆','卡隆','','其他人物'),('jodson','约德森','约德森','','其他人物')])
candidates.extend([('blight','布莱特','布莱特','','值夜者'),('foulet_ken','福莱特·肯','福莱特','','其他人物')])
candidates.extend([('nina_future','妮娜','妮娜','','其他人物'),('ottolov','奥托洛夫','奥托洛夫','','其他人物')])
candidates.extend([('nilou', '妮露', '妮露', '', '其他人物'), ('david_raymond', '戴维·雷蒙', '戴维', '', '其他人物'), ('heiter', '海特尔', '海特尔', '', '其他人物'), ('alessuhod', '阿勒苏霍德', '阿勒苏霍德', '', '其他人物'), ('ankewelt', '安格尔威德', '安格尔威德', '', '其他人物'), ('baron', '巴伦', '巴伦', '', '其他人物'), ('bloody_jack', '血腥杰克', '血腥杰克', '', '宿命之环'), ('patrick_bryan', '帕特里克·布雷恩', '帕特里克·布雷恩', '', '其他人物')])
candidates.extend([('caitlyn_hall', '凯特琳·霍尔', '凯特琳', '', '其他人物'), ('anlisa', '安丽萨', '安丽萨', '', '其他人物'), ('lavoro', '劳博罗', '劳博罗', '', '其他人物'), ('hilbert', '希尔伯特·阿鲁卡尔德', '希尔伯特', '', '其他人物'), ('stephen_h', '斯蒂芬·汉普雷斯', '汉普雷斯', '', '其他人物')])
candidates.extend([('ancient_sun','远古太阳神','远古太阳神','','其他人物'),('true_creator','真实造物主','真实造物主','','其他人物')])
candidates.extend([('green_dream','格林','格林','','宿命之环'),('jiangyue_dream','江月','江月','','宿命之环')])
candidates.append(('aerken','艾尔肯','艾尔肯','','宿命之环'))
candidates.extend([('wendell','文德尔','文德尔','','其他人物'),('aflo','艾芙洛','艾芙洛','','其他人物'),('yebus','耶布斯','耶布斯','','宿命之环'),('heraberg','赫拉贝格','赫拉贝格','','宿命之环'),('noelia','诺艾丽娅','诺艾丽娅','','宿命之环')])
candidates.extend([('walter','瓦尔特','瓦尔特','','其他人物'),('richardson','理查德森','理查德森','','其他人物'),('tracy','特雷茜','特雷茜','','其他人物'),('amilys','艾弥留斯·利维特','艾弥留斯','','其他人物'),('gawain','高文','高文','','其他人物'),('starling','斯塔琳·萨默尔','斯塔琳','','其他人物'),('canos','卡诺','卡诺','','其他人物'),('heimm','海因姆','海因姆','','其他人物'),('gusin','古辛','古辛','','宿命之环'),('gabriel','加布里埃尔','加布里埃尔','','宿命之环'),('fidel','菲德尔','菲德尔','','宿命之环'),('bainfel','巴音费尔','巴音费尔','','宿命之环'),('rubio','鲁维奥·帕科','鲁维奥','','宿命之环'),('rayasa','雷亚萨','雷亚萨','','宿命之环'),('maislo','麦斯洛','麦斯洛','','宿命之环')])
candidates.extend([('julien_jenna','朱利安','朱利安','','宿命之环'),('chogori','乔戈里','乔戈里','','其他人物'),('karat','卡拉特','卡拉特','','其他人物'),('delllau','鲍利·德尔劳','德尔劳','','其他人物'),('perle','佩尔乐','佩尔乐','','宿命之环')])
candidates.extend([('mahti_mori','莫里·马赫特','马赫特议员','','其他人物'),('mountbatten','比奇·蒙巴顿','蒙巴顿','','其他人物'),('byers','拜尔斯','拜尔斯','','其他人物'),('luka','卢卡·布鲁斯特','卢卡','','其他人物'),('jasmin','贾斯敏','贾斯敏','','其他人物'),('nikira','尼基拉','尼基拉','','宿命之环'),('xu_xinyang','徐新阳','徐新阳','','宿命之环'),('madame_michel','米歇尔太太','米歇尔太太','','宿命之环'),('ruhr','鲁尔','鲁尔','','宿命之环'),('bram','布拉姆·安德雷拉德','布拉姆','','宿命之环')])
candidates.extend([('antigonus','安提哥努斯','安提哥努斯','','其他人物'),('zarathustra','查拉图斯特拉','查拉图斯特拉','','宿命之环')])
candidates.extend([('vijaypan','维杰潘','维杰潘','','宿命之环'),('les_morora','列斯','列斯','','宿命之环'),('kemolo','克墨洛','克墨洛','','宿命之环'),('vanak','瓦纳克','瓦纳克','','宿命之环'),('griffith','格里菲斯','格里菲斯','','宿命之环'),('robert_south','罗伯特','罗伯特','','宿命之环')])
candidates.extend([('mesanyes','梅桑耶斯','梅桑耶斯','','其他人物'),('haggis','哈吉斯','哈吉斯','','其他人物')])
candidates.append(('bayenna','拜恩纳','拜恩纳','','宿命之环'))
candidates.extend([('georgia_paco','乔吉娅','乔吉娅','','宿命之环'),('marta_paco','玛尔塔','玛尔塔','','宿命之环')])
candidates.extend([('brown_sauron','布朗丝·索伦','布朗丝','','宿命之环'),('pedro_captain','佩德罗船长','佩德罗','','宿命之环')])
candidates.extend([('hisoka','西索','西索','','宿命之环'),('mad_lady','疯女','疯女','','宿命之环'),('bard_april','吟游诗人','吟游诗人','','宿命之环'),('agent_007','007','007','','宿命之环'),('friend_april','我有个朋友','我有个朋友','','宿命之环')])
candidates.extend([('gandalf','甘道夫','甘道夫','','宿命之环'),('professor','教授','教授','','宿命之环'),('associate_professor','副教授','副教授','','宿命之环'),('condensed_matter','凝聚态','凝聚态','','宿命之环')])
candidates.extend([('periodic_table','元素周期表','元素周期表','','宿命之环'),('isotope','同位素','同位素','','宿命之环'),('lady_moon','月女士','月女士','','宿命之环'),('underworld_taoist','冥道人','冥道人','','宿命之环')])
candidates.extend([('leodero','列奥德罗','列奥德罗','','其他人物'),('aucuses','奥赛库斯','奥赛库斯','','其他人物')])
candidates.append(('elaine','伊莲','伊莲','','其他人物'))
candidates.append(('butis','布提斯','布提斯','','其他人物'))
candidates.append(('kisma','克斯玛','克斯玛','','其他人物'))
candidates.extend([('mr_a','A先生','A先生','','其他人物'),('becklang','贝克朗·让·马丹','贝克朗','','其他人物')])
candidates.append(('mr_z','Z先生','Z先生','','其他人物'))
candidates.append(('christina','克里斯蒂娜','克里斯蒂娜','','其他人物'))
candidates.append(('meursault','默尔索','默尔索','','其他人物'))
candidates.append(('qilangos','齐林格斯','齐林格斯','','其他人物'))
candidates.extend([('katarina','卡特琳娜·佩莱','卡特琳娜','','其他人物'),('ludwell','路德维尔','路德维尔','','其他人物'),('wisdom_eye','智慧之眼','智慧之眼','','其他人物'),('kavituwa','卡维图瓦','卡维图瓦','','其他人物')])
candidates.extend([('hidden_sage','隐匿贤者','隐匿贤者','','其他人物'),('mother_tree','欲望母树','欲望母树','','其他人物'),('great_mother','伟大母亲','伟大母亲','','宿命之环')])
candidates.extend([('chained_god','被缚之神','被缚之神','','其他人物'),('suah','斯厄阿','斯厄阿','','其他人物'),('agaritu','阿加里图','阿加里图','','其他人物')])
candidates.append(('philip_general','腓力将军','腓力','','宿命之环'))
candidates.append(('annise','安妮丝','安妮丝','','宿命之环'))
candidates.append(('katy_guard','凯蒂（卡平护卫）','凯蒂','','其他人物'))
candidates.append(('park_guard','帕克（卡平别墅）','帕克','','其他人物'))
candidates.append(('utravsky','乌特拉夫斯基','乌特拉夫斯基','','其他人物'))
candidates.append(('mistral','米斯特拉尔','米斯特拉尔','','其他人物'))
candidates.append(('steam_god','蒸汽与机械之神','蒸汽与机械之神','','其他人物'))
candidates.extend([
 ('sharf','夏尔夫·朱恩','夏尔夫','','其他人物'),
 ('djinni','灯神','灯神','','其他人物'),
 ('stafford','斯特福德子爵','斯特福德','','其他人物'),
 ('ozil','奥兹尔','奥兹尔','','其他人物'),
 ('sothos_young','索托斯·扬','索托斯','','其他人物'),
 ('bilt', '比尔特·白兰度', '比尔特', '', '其他人物'),
 ('casimi', '卡西米·奥德拉', '卡西米', '', '其他人物'),
 ('mithor', '米索尔·金', '米索尔', '', '其他人物'),
 ('bouvoir', '布瓦尔·蓬派罗', '布瓦尔', '', '宿命之环'),
 ('paulina', '保利娜', '保利娜', '', '宿命之环'),
 ('beatrice', '碧翠丝·安库尔', '碧翠丝', '', '宿命之环'),
 ('zerel','泽瑞尔·维克托·李','泽瑞尔','','其他人物'),
 ('pallas_negan','帕拉斯·尼根','帕拉斯·尼根','','其他人物'),
 ('kaslana','卡斯兰娜','卡斯兰娜','','其他人物'),
 ('stuart_detective','斯图亚特','斯图亚特','','其他人物'),
 ('carlson','卡尔森','卡尔森','','其他人物'),
])
# Alternate identities of Klein are not separate people.
candidates=[x for x in candidates if x[0] not in ('gehrman','sherlock','celia','kukva','agent_007','wisdom_eye','patrick','nikira','zarathustra')]
candidates=[('jason','欲望使徒','欲望使徒','','其他人物') if x[0]=='jason' else x for x in candidates]
# 库克瓦在所提供原文中是城市名，不是人物。
# 伊康瑟属于蒸汽教会的机械之心，不属于黑夜教会的值夜者。
candidates=[(*x[:4], '其他人物') if x[0]=='ikance' else x for x in candidates]
texts=[(name,path.read_text(encoding=enc,errors='replace')) for name,path,enc in books]
out=[]
for ident,name,short,exact,group in candidates:
 terms={'patrick_bryan':['帕特里克·布雷恩','帕特里克·布莱恩'], 'cattleya':['嘉德丽雅','星之上将','星之女王'], 'bernadette':['贝尔纳黛','神秘女王'], 'amanises':['阿曼妮西斯','黑夜女神'], 'roselle':['罗塞尔','黄涛'], 'lumian':['卢米安','路易·贝里','夏尔·杜布瓦'], 'trissy':['特莉丝','特里斯'], 'pierre':['皮埃尔·贝里'], 'gardner':['加德纳'], 'pons':['蓬斯'], 'charlie':['查理'], 'rato':['拉托'], 'voisin':['瓦赞'], 'hugues_correct':['于格·阿图瓦'], 'klein':['克莱恩','周明瑞','格尔曼·斯帕罗','格尔曼','夏洛克·莫里亚蒂','夏洛克','道恩·唐泰斯','道恩·唐泰斯','梅林·赫尔墨斯']}.get(ident,[exact or short])
 if ident == 'essinger':
  terms=['艾辛格·斯坦顿','艾辛格','斯坦顿','“智慧之眼”']
 if ident == 'sherman':
  terms.append('雪曼')
 if ident == 'louis_wien':
  terms.append('X先生')
 if ident == 'sasrir':
  terms.extend(['暗天使','萨斯列尔'])
 if ident == 'alista':
  terms.append('血皇帝')
 if ident in {'edwina','senor','qilangos'}:
  terms.append({'edwina':'冰山中将','senor':'血之上将','qilangos':'飓风中将'}[ident])
 if ident == 'franca':
  terms.extend(['查内姆','罗芙','“红靴子”','“袖剑”'])
 if ident == 'angouleme':
  terms.append('“007”')
 if ident == 'enzo_winner':
  terms.append('恩尤尼')
 if ident == 'zarath':
  terms.append('查拉图斯特拉')
 if ident == 'bernadette':
  terms.append('黄贝贝')
 if ident == 'jenna':
  terms.extend(['切莉娅','“小婊子”'])
 if ident == 'mahti_mori':
  terms.append('莫里·马赫特')
 if ident == 'antigonus':
  terms.append('安小天')
 if ident == 'frank':
  terms.extend(['李克己','李克已'])
 if ident == 'lumian':
  terms.append('李明')
 if ident == 'ludwig':
  terms.append('李路')
 if ident == 'anthony':
  terms.append('安瑞德')
 if ident == 'fors':
  terms.append('没有梦想的咸鱼')
 if ident == 'rato':
  terms.append('咸蛋超人')
 if ident == 'hisoka':
  terms.append('特瓦纳科')
 if ident == 'mary_short':
  terms=['玛丽·肖特','玛丽·盖尔','玛丽夫人','玛丽太太']
 if ident == 'roche':
  terms=['洛希']
 if ident == 'drag_gail':
  terms=['多拉古','多拉格']
 if ident == 'maric':
  terms.append('宝剑骑士')
 if ident == 'clarisse':
  terms.append('黑之魔女')
 if ident == 'leodero':
  terms.append('风暴之主')
 if ident == 'herabergen':
  terms.append('知识与智慧之神')
 if ident == 'cheek':
  terms.append('原初魔女')
 if ident == 'agaritu':
  terms.append('不死之王')
 if ident == 'leomaster':
  terms.append('黑之圣者')
 terms=sorted(set(terms),key=len,reverse=True)
 pattern=re.compile('|'.join(map(re.escape,terms)))
 # 莱恩 is also a substring of 克莱恩; those hits do not identify Ryan.
 if ident == 'lumian':
  # “卢米安·李明明……”中的“李明”跨姓名与副词，并非梦境假名。
  pattern=re.compile('|'.join(r'李明(?!明)' if term == '李明' else re.escape(term) for term in terms))
 elif ident == 'franca':
  # 连写的称号与名字只计一次；未加引号的红色靴子不计作人物。
  pattern=re.compile(r'(?:(?:“红靴子”|“袖剑”)\s*)?芙兰卡|“红靴子”|“袖剑”|查内姆|罗芙')
 elif ident == 'jenna':
  # 舞台绰号和姓名连写算一次；“浮夸女”亦可泛指其他表演者。
  pattern=re.compile(r'(?:“小婊子”\s*)?简娜|切莉娅|“小婊子”')
 elif ident == 'rato':
  # 连写的“咸蛋超人”拉托是一次提及，不重复计入。
  pattern=re.compile(r'(?:“咸蛋超人”\s*)?拉托|咸蛋超人')
 elif ident == 'hisoka':
  pattern=re.compile(r'(?:“西索”[，,、\s]*)?特瓦纳科|西索')
 elif ident == 'cattleya':
  pattern=re.compile(r'(?:[“]?(?:星之上将|星之女王)[”]?[，,、\s]*)?嘉德丽雅|星之上将|星之女王')
 elif ident == 'bernadette':
  pattern=re.compile(r'(?:[“]?神秘女王[”]?[，,、\s]*)?贝尔纳黛|神秘女王|黄贝贝')
 elif ident == 'clarisse':
  pattern=re.compile(r'(?:[“]?黑之魔女[”]?[，,、\s]*)?克拉丽丝|黑之魔女')
 elif ident == 'maric':
  pattern=re.compile(r'(?:[“]?宝剑骑士[”]?[，,、\s]*)?马里奇|宝剑骑士')
 elif ident == 'ryan':
  pattern=re.compile(r'(?<!克)莱恩')
 elif ident == 'katy_guard':
  pattern=re.compile(r'凯蒂(?![·.]斯蒂芬娜)')
 elif ident == 'essinger':
  pattern=re.compile(r'“智慧之眼”(?:老先生)?[，,、\s]*(?:大侦探)?艾辛格(?:[·.]斯坦顿)?|艾辛格(?:[·.]斯坦顿)?|斯坦顿|“智慧之眼”')
 elif ident == 'sothos_young':
  pattern=re.compile(r'索托斯(?!特)')
 elif ident == 'mithor':
  pattern=re.compile(r'(?<!德)米索尔')
 elif ident == 'beatrice':
  pattern=re.compile(r'碧翠丝(?!的?项链)')
 elif ident == 'roselle':
  pattern=re.compile(r'(?<!格)罗塞尔|黄涛')
 elif ident == 'canos':
  pattern=re.compile(r'(?<!托斯)卡诺')
 elif ident == 'les_morora':
  pattern=re.compile(r'(?<!帕)列斯')
 elif ident == 'guillaume':
  pattern=re.compile(r'(?<!小)(?<!皮埃尔·)(?<!皮埃尔\.)纪尧姆(?![·.](?:利齐耶|皮埃尔|贝里)|叔叔)')
 elif ident == 'soest':
  pattern=re.compile(r'(?<!特伦)索斯特')
 elif ident == 'goodwill':
  pattern=re.compile(r'古德维尔(?!化工厂)')
 elif ident == 'groselle':
  pattern=re.compile(r'格罗塞尔(?!游记)')
 elif ident == 'hermes':
  pattern=re.compile(r'(?<!古)赫密斯(?!语|文)')
 elif ident == 'ormir':
  pattern=re.compile(r'奥尔米尔(?!葡萄酒)')
 elif ident == 'medici':
  pattern=re.compile(r'(?<!阿不思·)(?<!阿不思\.)梅迪奇(?!家族)')
 elif ident == 'cheek':
  pattern=re.compile(r'(?<!特莉丝)奇克|原初魔女')
 elif ident == 'frye':
  pattern=re.compile(r'(?<!汉)弗莱(?!娅)')
 elif ident == 'wendell':
  pattern=re.compile(r'文德尔(?!街)')
 elif ident == 'zarath':
  pattern=re.compile(r'查拉图斯特拉|查拉图')
 elif ident == 'antigonus':
  pattern=re.compile(r'安提哥努斯(?!家族|笔记)|安小天')
 elif ident in {'edwina','senor','qilangos'}:
  title={'edwina':'冰山中将','senor':'血之上将','qilangos':'飓风中将'}[ident]
  pattern=re.compile(r'(?:[“]?'+title+r'[”]?[，,、\s]*)?'+short+r'|'+title)
 elif ident == 'alista':
  pattern=re.compile(r'(?:[“]?血皇帝[”]?[，,、\s]*)?亚利斯塔(?:[·.]图铎)?|血皇帝')
 elif ident == 'sasrir':
  pattern=re.compile(r'(?:[“]?暗天使[”]?[，,、\s]*)?(?:萨斯利尔|萨斯列尔)|暗天使')
 elif ident == 'agaritu':
  pattern=re.compile(r'(?:[“]?不死之王[”]?[，,、\s]*)?阿加里图|不死之王')
 elif ident == 'leomaster':
  pattern=re.compile(r'(?:[“]?黑之圣者[”]?[，,、\s]*)?利奥马斯特|黑之圣者')
 elif ident == 'friend_april':
  pattern=re.compile(r'(?<=“)(我有个朋友)(?=”)')
 elif ident == 'angouleme':
  pattern=re.compile(r'“007”\s*昂古莱姆|昂古莱姆\s*“007”|昂古莱姆|“007”')
 elif ident in {'professor','associate_professor','condensed_matter','periodic_table','isotope','lady_moon','underworld_taoist'}:
  pattern=re.compile(r'(?<=“)' + re.escape(short) + r'(?=”)')
 term=' / '.join(terms)
 counts={book:sum(1 for _ in pattern.finditer(text)) for book,text in texts}
 if ident == 'charlie':
  # 诡秘之主中的查理·雷克及科尔杜村的同名男仆并非查理·科伦特。
  counts['诡秘之主'] = 0
  _, path, enc = BOOKS[1]
  counts['宿命之环'] = sum(body.count('查理') for volume, chapter, body in iter_chapters(path,enc) if '第一部' not in volume)
 if ident == 'jason_zombie':
  # Only chapters individually reviewed for this character, not other Jasons.
  _, path, enc = BOOKS[0]
  counts['诡秘之主'] = sum(body.count('杰森') for volume, chapter, body in iter_chapters(path,enc)
                              if '第二部' in volume and chapter.startswith(('第一百三十三章','第一百三十四章','第一百三十五章','第一百三十六章','第一百三十七章')))
  term = '杰森（已核对章节）'
 if ident in {'pasha_beldan','roy_beldan','byers_beldan','phil_beldan','byers'}:
  _, path, enc = BOOKS[0]
  reviewed = (('第七十章','第七十一章','第七十四章','第七十七章','第七十八章') if ident == 'byers'
              else ('第十五章','第十六章','第十七章','第十八章','第十九章','第二十章','第二十一章','第二十二章','第二十三章','第二十四章'))
  counts['诡秘之主'] = sum(body.count(short) for volume, chapter, body in iter_chapters(path,enc)
                              if '第七卷' in volume and chapter.startswith(reviewed))
  term = short + '（已核对章节）'
 if ident == 'anna_tingen':
  _, path, enc = BOOKS[0]
  reviewed=('第五十四章','第五十五章','第五十六章','第六十三章','第八十一章','第八十二章','第八十三章','第一百二十四章')
  counts['诡秘之主']=sum(body.count('安娜') for volume, chapter, body in iter_chapters(path,enc)
                             if '第一部' in volume and chapter.startswith(reviewed))
  term='安娜（已核对章节）'
 if ident == 'harry_owl':
  _, path, enc = BOOKS[0]
  inside=False
  count=0
  for volume, chapter, body in iter_chapters(path,enc):
   if '第三部' not in volume:
    continue
   if chapter.startswith('第一百零三章'):
    inside=True
   if inside:
    count += len(re.findall(r'猫头鹰哈里|哈里|猫头鹰', body))
   if chapter.startswith('第一百三十章'):
    break
  counts['诡秘之主']=count
  term='哈里 / 猫头鹰（已核对章节）'
 if ident == 'griffith':
  counts['宿命之环']=sum(len(re.findall(r'尼基拉|格里菲斯', body))
      for volume, heading, body in iter_chapters(BOOKS[1][1], BOOKS[1][2]))
  term='尼基拉 / 格里菲斯'
 if ident == 'bayenna':
  # “酒吧老板” is unambiguous in these two consecutive chapters only.
  counts['诡秘之主']=0
  counts['宿命之环']=sum(body.count('酒吧老板')
      for volume, heading, body in iter_chapters(BOOKS[1][1], BOOKS[1][2])
      if volume.startswith('第五部') and heading.startswith(('第六十一章','第六十二章')))
  counts['宿命之环']+=dict(texts)['宿命之环'].count('拜恩纳')
  term='拜恩纳 / 酒吧老板（已核对两章）'
 if ident == 'pallas_negan':
  # The title passes to his son. Count it only up through the assassination.
  novel = dict(texts)['诡秘之主']
  before, after = novel.split('第二百一十三章 “1-42”', 1)
  counts['诡秘之主'] = len(re.findall(r'帕拉斯·尼根(?:公爵)?|尼根公爵', before)) + after.count('帕拉斯·尼根')
  term = '帕拉斯·尼根 / 尼根公爵（遇刺及以前）'
 if ident in {'philip_general','annise'}:
  counts['诡秘之主']=0
 if ident in {'morane','roche_louise','class_kitz','snalna','travis','ailos','delilah','vermond_sauron','niol','fernandez','ivilista','basil_pirate'}:
  counts['诡秘之主']=0
 if ident in {'urdi','galis','windsor','okfa','louis_wien','ernest','donna_branch','denton_branch','cleves','cecil_guard','hood_eugen','william_sykes','ael_moria','bird_mustan','mary_short','drag_gail','erica_taylor','luke_summer','hibbert_hall','sindras','carlon','jodson','blight','foulet_ken'}:
  counts['宿命之环']=0
 if ident in {'meviti','skoll_pirate','huntley_pirate','jason'}:
  counts['宿命之环']=0
 if ident in {'steve_wraith','enzo_winner','coshnam','yurisian','karaman','bogda_jones','wos_kent','jason_zombie','tyr_werewolf'}:
  counts['宿命之环']=0
 if ident in {'pasha_beldan','roy_beldan','byers_beldan','phil_beldan','byers'}:
  counts['宿命之环']=0
 if ident == 'anna_tingen':
  counts['宿命之环']=0
 if ident in {'harry_owl','richard_fate'}:
  counts['宿命之环']=0
 if ident in {'ait_hammer','harman_bald','olsen_supervisor','castina','osaito','chris_mana'}:
  counts['诡秘之主']=0
 if ident in {'thibaut_jacques','gusin','gabriel','fidel','bainfel','rubio','rayasa','maislo','julien_jenna','perle','nikira','xu_xinyang','madame_michel','ruhr','bram','vijaypan','les_morora','kemolo','vanak','griffith','robert_south','brown_sauron','pedro_captain','hisoka','mad_lady','bard_april','agent_007','friend_april','gandalf','professor','associate_professor','condensed_matter','periodic_table','isotope','lady_moon','underworld_taoist'}:
  counts['诡秘之主']=0
 # The raw short name may refer to unrelated people in the other book.
 if ident in {'bloody_jack','clarisse','valerio','goodwill','laurent','herdsey','flameng','francesco','primpin','devaho','sallent','worms','grisha','hela','mister_k','black_scorpion','riya','harrison','beost','madena','roche','julie','philippe','salistes','montserrat','guy','albus','poufer','vermonda','anthony','brignais','elodie','fells','misiri','black','christo','simon','kali','ryan','pierre','gardner','pons','celia','charlotte','charlie','rato','voisin','montsouris','hugues_correct'}:
  counts['诡秘之主']=0
 total=sum(counts.values())
 if total>10:
  out.append(dict(id=ident,name=name,short=short,mark=short[0],alias={'klein':'周明瑞 / 格尔曼·斯帕罗 / 夏洛克·莫里亚蒂 / 道恩·唐泰斯 / 梅林·赫尔墨斯', 'patrick_bryan':'帕特里克·布莱恩（原文异写）', 'trissy':'特里斯', 'black_scorpion':'黑蝎', 'lilith':'曾使用欧弥贝拉之名 / 大地母神', 'audrey':'正义', 'alger':'倒吊人', 'fors':'魔术师', 'derrick':'太阳', 'emlyn':'月亮', 'cattleya':'隐者 / 星之上将 / 星之女王', 'leonard':'星星', 'xio':'审判', 'amon':'曾冒用忒尔弥波洛斯之名', 'amanises':'黑夜女神 / 厄运女神', 'roselle':'黄涛', 'bernadette':'神秘女王', 'bethel_abraham':'门先生', 'lumian':'夏尔 / 夏尔·杜布瓦 / 路易·贝里'}.get(ident,''),group=group,mentions=total,mentionTerm=term,counts=counts))
# Identity evidence is stored separately from literal counting; common aliases
# such as “夏尔” are searchable but not counted without disambiguation.
identity_sources = {
 'steam_god':[{'alias':'工匠之神（旧称）','source':'《诡秘之主》第一部，第四章《占卜》；《诡秘之主》第七部总结之后，第二十四章《疯狂的呓语》'}],
 'patrick_bryan':[{'alias':'帕特里克·布莱恩（原文异写）','source':'《诡秘之主》第五部，第三十章《狂信徒》'}],
 'bethel_abraham':[{'alias':'门先生','source':'《诡秘之主》第六部，第四十五章《“0”级》'}],
 'lilith':[{'alias':'曾使用欧弥贝拉之名 / 大地母神','source':'《宿命之环》第七部，第二十六章《第一个牧师》'}],
 'black_scorpion':[{'alias':'黑蝎','source':'《宿命之环》第二部，第二十三章《黑蝎》'}],
 'audrey':[{'alias':'正义','source':'《诡秘之主》第一部，第九十四章《隐匿贤者》'}],
 'alger':[{'alias':'倒吊人','source':'《诡秘之主》第一部，第三十六章《一个简单的问题》'}],
 'fors':[{'alias':'魔术师','source':'《诡秘之主》第二部，第九十八章《互相观察》'}],
 'derrick':[{'alias':'太阳','source':'《诡秘之主》第一部，第一百四十四章《三方交易》'}],
 'emlyn':[{'alias':'月亮','source':'《诡秘之主》第二部，第二百五十六章《吸血鬼女王》'}],
 'cattleya':[{'alias':'隐者','source':'《诡秘之主》第三部，第八十四章《衣物细节》'}, {'alias':'星之上将','source':'《诡秘之主》第二部，第七十九章《交流消息》'}, {'alias':'星之女王','source':'《宿命之环》第六部，第四十五章《电影》'}],
 'bernadette':[{'alias':'神秘女王','source':'《诡秘之主》第三部，第一百九十章《旁观》'}],
 'leonard':[{'alias':'星星','source':'《诡秘之主》第五部，第十二章《贴标签》'}],
 'xio':[{'alias':'审判','source':'《诡秘之主》第五部，第十二章《贴标签》'}],
 'amon':[{'alias':'曾冒用忒尔弥波洛斯之名','source':'《宿命之环》第五部，第一百四十一章《病人》、第一百四十二章《应许之事》'}],
 'amanises':[{'alias':'黑夜女神 / 厄运女神','source':'《诡秘之主》第五部，第一百七十二章《克莱恩的畏惧》'}],
 'roselle':[{'alias':'黄涛','source':'《诡秘之主》第二部，第一百四十六章《渎神者》'}],
 'klein': [
  {'alias':'夏洛克·莫里亚蒂','source':'《诡秘之主》第二部，第二章《萨默尔太太》'},
  {'alias':'格尔曼·斯帕罗','source':'《诡秘之主》第三部，第一章《新的身份》'},
  {'alias':'道恩·唐泰斯','source':'《诡秘之主》第四部，第一章《归来记》'},
  {'alias':'梅林·赫尔墨斯','source':'《诡秘之主》第七卷，第三十章《天文学爱好者》'}],
 'trissy':[{'alias':'特里斯','source':'《诡秘之主》第一部，第一百二十五章《大胆的想法》；第二部，第二百五十七章《名字》'}],
 'lumian':[{'alias':'夏尔 / 夏尔·杜布瓦','source':'《宿命之环》第二部，第一章《外乡人》；第一百一十三章《传单》'}, {'alias':'路易·贝里','source':'《宿命之环》第四部，第二十二章《提问的方式》'}]
}
match_notes = {'true_creator':'“真实造物主”在不同阶段与亚当存在复杂身份关系；此处单列称号以保留融合前后的叙述。', 'ancient_sun':'仅统计“远古太阳神”字面写法；“造物主”等称号可能指不同存在，尚未直接合并。', 'david_raymond':'统计“戴维”的字面出现，可能包含同名人物；完整姓名出现十次。', 'patrick_bryan':'合计完整姓名的“布雷恩”和“布莱恩”两种写法；与帕特里克·杰森分别计数。', 'cattleya':'包含“嘉德丽雅”“星之上将”“星之女王”的字面匹配，称号与姓名连写只计一次；代号“隐者”暂未计入。', 'bernadette':'包含“贝尔纳黛”和“神秘女王”的字面匹配；仍需结合语境核对。', 'soest':'排除了“特伦索斯特”中的命中；其他同名用法仍需核对。', 'goodwill':'排除紧随“化工厂”的命中；仅写姓氏时可能指家族或其他人。', 'groselle':'排除了《格罗塞尔游记》书名的直接命中，其余字面结果仍需消歧。', 'hermes':'排除了明显的“古赫密斯”、赫密斯语及赫密斯文命中；其余字面结果仍可能指文字或语言。', 'ormir':'排除了“奥尔米尔葡萄酒”的命中；其他同名用法仍需人工核查。', 'lilith':'只统计“莉莉丝”，不将有其他历史身份的大地母神或欧弥贝拉字面命中直接算入。', 'medici':'排除了完整写作“阿不思·梅迪奇”及“梅迪奇家族”的命中；其他仅写姓氏的语境仍有歧义。', 'termiboros':'该名字既指真正的忒尔弥波洛斯，也曾被阿蒙冒用；字面次数未区分两者。', 'amon':'阿蒙曾冒用忒尔弥波洛斯的名字，相关歧义称呼未计入阿蒙的字面次数。', 'amanises':'包含“阿曼妮西斯”和“黑夜女神”的字面匹配；其他称号尚未计入。', 'roselle':'包含“罗塞尔”和“黄涛”的字面匹配，梦境形象等语境仍需人工区分。', 'ryan':'排除了“克莱恩”中的相同字串，仅统计《宿命之环》。', 'guillaume':'排除明确指向纪尧姆·利齐耶、纪尧姆·皮埃尔、纪尧姆·贝里及皮埃尔·纪尧姆的写法，以及“小纪尧姆”和“纪尧姆叔叔”；单独的纪尧姆仍可能有歧义。', 'frye':'排除了“弗莱娅”和“汉弗莱”中的命中；仍可能有其他同名。', 'lumian':'含“卢米安”“路易·贝里”和“夏尔·杜布瓦”；单独的“夏尔”有歧义，尚未计入。'}
# Classification evidence preserves the wording and period in the text. It is
# deliberately not inferred from relationship tags or the broad UI group.
classification_evidence = {
 'alista': [{'kind':'sequence','value':'红祭司','source':'《宿命之环》第三部，第一百七十章《隐秘的往事》'}],
 'qilangos': [{'kind':'sequence','value':'风眷者','source':'《诡秘之主》第一部，第一百九十二章《重视》'}],
 'meursault': [{'kind':'organization','value':'兹曼格党','source':'《诡秘之主》第二部，第十一章《玄学型侦探》'}, {'kind':'sequence','value':'猎人','source':'《诡秘之主》第二部，第二十一章《满月的夜晚》'}],
 'heraberg': [{'kind':'organization','value':'知识教会','source':'《宿命之环》第五部，第六十八章《传递信息》'}],
 'julie': [{'kind':'organization','value':'魔女教派','source':'《宿命之环》第五部，第六十八章《传递信息》'}, {'kind':'sequence','value':'痛苦魔女','source':'《宿命之环》第五部，第六十八章《传递信息》'}],
 'salistes': [{'kind':'sequence','value':'魔女','source':'《宿命之环》第五部，第九十一章《进入》'}],
 'daley': [{'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第十四章《通灵者》'}, {'kind':'sequence','value':'通灵者','source':'《诡秘之主》第一部，第二十八章《密修会》'}],
 'mr_z': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第一部，第一百四十五章《合作的请求》'}],
 'sirius': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第一部，第一百零六章《画家克莱恩》'}, {'kind':'sequence','value':'秘祈人','source':'《诡秘之主》第一部，第一百零六章《画家克莱恩》'}],
 'haines': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第一部，第二百一十章《故事》'}],
 'mr_a': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第二部，第四十一章《各方》'}],
 'louis_wien': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第三部，第一百六十四章《莱曼诺的魔法书》'}],
 'kisma': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第六部，第四十四章《狮子搏兔》'}],
 'butis': [{'kind':'organization','value':'极光会','source':'《诡秘之主》第五部，第一百三十章《多里安的请求》'}, {'kind':'sequence','value':'旅行家','source':'《诡秘之主》第三部，第一百六十四章《莱曼诺的魔法书》'}],
 'laurence': [{'kind':'organization','value':'亚伯拉罕家族','source':'《诡秘之主》第二部，第一百六十一章《人工梦游》'}],
 'lavoro': [{'kind':'organization','value':'亚伯拉罕家族','source':'《诡秘之主》第二部，第一百六十一章《人工梦游》'}],
 'dorian': [{'kind':'organization','value':'亚伯拉罕家族','source':'《诡秘之主》第三部，第一百六十四章《莱曼诺的魔法书》'}],
 'aurore': [{'kind':'organization','value':'卷毛狒狒研究会','source':'《宿命之环》第一部，第四十八章《知识逐人》'}],
 'franca': [{'kind':'organization','value':'卷毛狒狒研究会','source':'《宿命之环》第二部，第六十六章《“袖剑”》'}],
 'friend_april': [{'kind':'organization','value':'愚人节小组','source':'《宿命之环》第三部，第一百四十五章《动机》'}],
 'klein': [{'kind':'sequence','value':'占卜家','source':'《诡秘之主》第一部，第三十章《新的开始》、第三十一章《魔药》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第九十七章《格斗老师》'}],
 'dunn': [{'kind':'sequence','value':'梦魇','source':'《诡秘之主》第一部，第二十二章《序列起始》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}],
 'frye': [{'kind':'sequence','value':'收尸人','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}],
 'ikance': [{'kind':'organization','value':'机械之心','source':'《诡秘之主》第二部，第二百零四章《阿罗德斯》'}],
 'blight': [{'kind':'organization','value':'值夜者（文职）','source':'《诡秘之主》第一部，第十九章《封印物》'}],
 'danitz': [{'kind':'sequence','value':'纵火家','source':'《诡秘之主》第三部，第七十一章《达尼兹的努力》'}],
 'audrey': [{'kind':'sequence','value':'观众','source':'《诡秘之主》第一部，第五十二章《观众》'}, {'kind':'organization','value':'塔罗会','source':'《诡秘之主》第一部，第七章《代号》'}],
 'fors': [{'kind':'sequence','value':'学徒','source':'《诡秘之主》第一部，第一百三十章《贝克兰德的隐秘聚会》'}],
 'leonard': [{'kind':'sequence','value':'午夜诗人','source':'《诡秘之主》第一部，第二十一章《他乡遇故知》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第二十一章《他乡遇故知》'}],
 'lumian': [{'kind':'sequence','value':'猎人','source':'《宿命之环》第一部，第三十七章《“危险丛林”》'}],
 'alger': [{'kind':'organization','value':'塔罗会','source':'《诡秘之主》第一部，第七章《代号》'}],
 'seeka': [{'kind':'sequence','value':'午夜诗人','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}],
 'luoyao': [{'kind':'sequence','value':'不眠者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}],
 'kornley': [{'kind':'sequence','value':'不眠者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}, {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第四十二章《管家刻利》'}],
}
# Sequence stages named directly in the corresponding chapters.
for ident, value, source in [
 ('alger','航海家','《诡秘之主》第一部，第九十二章《“心理学专家”》'),
 ('derrick','歌颂者','《诡秘之主》第一部，第一百五十七章《梦想的物品》'),
 ('xio','仲裁人','《诡秘之主》第一部，第一百四十六章《蠕动的饥饿》'),
]:
 classification_evidence.setdefault(ident, []).append({'kind':'sequence','value':value,'source':source})
# Chapter-specific sequence descriptions and a separately labelled inference.
for ident, value, source in [
 ('aurore','巫师','《宿命之环》第一部，第二十五章《序列与魔药》'),
 ('tracy','痛苦魔女','《诡秘之主》第三部，第九十三章《黄金梦想号》'),
 ('amon','偷盗者','《宿命之环》第三部，第九十四章《莫尼特的真实身份》'),
 ('adam','空想家','《宿命之环》第六部，第一百三十章《转院》'),
 ('franca','魔女','《宿命之环》第二部，第七十章《大餐》'),
 ('jenna','刺客','《宿命之环》第二部，第五十八章《聚合》'),
 ('cattleya','星象师','《诡秘之主》第三部，第八十三章《窥秘之眼》'),
 ('sharron','怨魂','《诡秘之主》第二部，第一百三十三章《登台前的魔术师》'),
 ('maric','囚犯','《宿命之环》第五部，第三十八章《哭喊声》'),
 ('anthony','心理医生','《宿命之环》第二部，第一百五十章《震慑》'),
 ('anderson','收割者','《诡秘之主》第三部，第一百七十一章《脸黑手黑》'),
 ('colin','猎魔者','《诡秘之主》第二部，第一百四十八章《半透明的小虫》'),
 ('lovia','牧羊人','《诡秘之主》第一部，第二百零二章《确认情况》'),
 ('trissy','教唆者','《诡秘之主》第一部，第一百二十五章《大胆的想法》'),
 ('bard_april','盗火人','《宿命之环》第三部，第一百四十六章《火刑》'),
 ('susie','观众','《诡秘之主》第二部，第八十二章《材料齐》'),
 ('oldneil','窥秘人','《诡秘之主》第一部，第二十八章《密修会》'),
 ('pallez','偷盗者','《诡秘之主》第四部，第九十九章《近在咫尺》'),
 ('frank','耕种者','《诡秘之主》第七卷，第五十七章《发展大计》'),
 ('edwina','阅读者','《诡秘之主》第三部，第二百一十四章《巨人守护者》'),
 ('senor','怨魂','《诡秘之主》第三部，第二百四十五章《幸运儿》'),
 ('heath','秘祈人','《诡秘之主》第五部，第一百八十八章《“门”先生》'),
 ('reinette','怨魂','《诡秘之主》第六部，第九十三章《忙而不乱》'),
 ('loki','秘偶大师','《宿命之环》第三部，第一百四十六章《火刑》'),
 ('zarath','占卜家','《诡秘之主》第四部，第一百零七章《古神的后裔》'),
 ('herwin','操纵师','《诡秘之主》第五部，第一百零六章《三打一》、第一百零七章《会长》'),
 ('will','水银之蛇','《诡秘之主》第三部，第一百二十四章《恐吓》'),
 ('ouroboros','水银之蛇','《诡秘之主》第三部，第四章《克莱恩的猜测》'),
 ('katarina','不老魔女','《诡秘之主》第三部，第一百零六章《旧相识》'),
 ('gilchies','欲望使徒','《诡秘之主》第三部，第二百零四章《难以完成的仪式》'),
 ('sherman','魔女','《诡秘之主》第五部，第七十三章《耐心》'),
 ('utravsky','黎明骑士','《诡秘之主》第二部，第九十四章《黎明骑士》'),
 ('magot','挑衅者','《宿命之环》第二部，第三十章《K先生》'),
 ('ludwell','看门人','《诡秘之主》第四部，第一百八十六章《猜测与想法》'),
]:
 pathway_only = {'amon':'错误', 'franca':'魔女', 'maric':'被缚者', 'pallez':'错误', 'frank':'母亲', 'reinette':'囚犯', 'edwina':'白塔', 'heath':'倒吊人', 'zarath':'愚者'}
 if ident in pathway_only:
  classification_evidence.setdefault(ident, []).append({'kind':'pathway','value':pathway_only[ident],'source':source,'note':'引文确认途径；起始序列名称不表示该人物当时的具体序列。'})
 else:
  classification_evidence.setdefault(ident, []).append({'kind':'sequence','value':value,'source':source})
for fact in classification_evidence.get('reinette', []):
 if fact.get('kind') == 'pathway' and fact.get('value') == '囚犯':
  fact['note'] = '引文称其具有“怨魂”能力，并非断定其当时位阶为序列5。'
for fact in classification_evidence.get('anderson', []):
 if fact.get('kind') == 'sequence' and fact.get('value') == '收割者':
  fact['certainty'] = 'inferred'
  fact['note'] = '嘉德丽雅在安德森展示能力后介绍“收割者”，此处依据上下文判断。'
for fact in classification_evidence.get('edwina', []):
 if fact.get('kind') == 'pathway' and '第二百一十四章《巨人守护者》' in fact.get('source', ''):
  fact['certainty'] = 'inferred'
  fact['note'] = '克莱恩根据书中经过判断其途径和当时的序列。'
for ident in ('bard_april', 'loki'):
 for fact in classification_evidence.get(ident, []):
  if fact.get('kind') == 'sequence' and '第一百四十六章《火刑》' in fact.get('source', ''):
   fact['certainty'] = 'inferred'
   fact['note'] = '这是“我有个朋友”的说法；他明确表示不确定吟游诗人的现状，洛基的阶段也有待独立核实。'
classification_evidence.setdefault('emlyn', []).append({'kind':'pathway','value':'月亮','source':'《诡秘之主》第五部，第一百八十八章《“门”先生》','note':'此处以药师指称途径，不代表埃姆林当时是序列9。'})
classification_evidence.setdefault('lumian', []).append({'kind':'pathway','value':'魔女','source':'《宿命之环》第六部，第十八章《站台(最后半天求月票)》；第七部，第九章《“不老”》','note':'由猎人途径跨入魔女途径；封印中的猎人途径力量不能直接等同本人序列。'})
classification_evidence.setdefault('gardner', []).append({
 'kind':'pathway','value':'红祭司','certainty':'inferred',
 'source':'《宿命之环》第二部，第一百三十二章《不屈》',
 'note':'芙兰卡判断他属于猎人途径，具体序列仍不确定。'
})
classification_evidence.setdefault('bernadette', []).append({
 'kind':'pathway','value':'隐者',
 'source':'《诡秘之主》第五部，第一百四十六章《可笑之人》；第七卷，第四十三章《上门辅导》',
 'note':'贝尔纳黛介绍窥秘人途径“贤者”的晋升条件，后来服食该魔药晋升。'
})
classification_evidence.setdefault('hidden_sage', []).append({
 'kind':'pathway','value':'隐者','relation':'authority','source':'《诡秘之主》第七卷，第四十三章《上门辅导》',
 'note':'原文称隐匿贤者是窥秘人途径的近似序列0存在。'
})
# Pathway clues checked against the named chapters; inference remains explicit.
for ident, value, source, note, certainty in [
 ('lugano','母亲','《宿命之环》第三部，第二十五章《自荐》','卢加诺自称序列9“耕种者”。','confirmed'),
 ('alhasson','黑夜','《诡秘之主》第一部，第七十三章《初战》','克莱恩指出艾尔·哈森和邓恩都是“梦魇”。','confirmed'),
 ('alfred','审判者','《诡秘之主》第七卷，第六十七章《现身说法》','阿尔弗雷德自称仲裁人途径序列5“惩戒骑士”。','confirmed'),
 ('bethel','门','《诡秘之主》第七卷，第七十章《交互》','原文指出维尔杜是学徒途径序列7。','confirmed'),
 ('george','黑皇帝','《诡秘之主》第五部，第一百四十一章《神灵的态度》','国王乔治三世谋求晋升黑皇帝。','confirmed'),
 ('shermane','魔女','《诡秘之主》第一部，第一百九十五章《“开锁专家”克莱恩》','克莱恩根据其身份和特莉丝的关系推测。','inferred'),
 ('hazel','错误','《诡秘之主》第四部，第二十七章《第一支舞》','克莱恩推测海柔尔属于偷盗者途径。','inferred'),
 ('zarathustra','愚者','《宿命之环》第六部，第六十三章《等价交换》','芙兰卡推测其为占卜家途径天使，身份判断仍存疑。','inferred'),
 ('leodero','暴君','《诡秘之主》第六部，第三十五章《重现》','高希纳姆称列奥德罗占据风暴神座，称其为“暴君”。','confirmed'),
 ('aucuses','太阳','《诡秘之主》第七卷，第八十章《“空想家”的特殊》','原文指出“纯白天使”奥赛库斯包容太阳途径序列1。','confirmed'),
 ('brown_sauron','魔女','《宿命之环》第三部，第一百三十五章《人血面包》','原文直接称布朗丝·索伦为魔女。','confirmed'),
 ('periodic_table','隐者','《宿命之环》第五部，第七十七章《奇怪的试卷》','根据聚会中对巫师的反应推断，个体身份仍待复核。','inferred'),
 ('isotope','隐者','《宿命之环》第五部，第七十七章《奇怪的试卷》','根据聚会中对巫师的反应推断，个体身份仍待复核。','inferred'),
]:
 fact = {'kind':'pathway','value':value,'source':source,'note':note}
 if certainty == 'inferred': fact['certainty'] = certainty
 classification_evidence.setdefault(ident, []).append(fact)
# Display the later pathway first, while keeping earlier stages and their
# chapter evidence explicit for characters who changed pathways.
classification_evidence['ince'] = [
 {'kind':'pathway','value':'黑夜','source':'《诡秘之主》第一部，第二百一十章《故事》','note':'此前为死神途径序列5“看门人”，后跨途径晋升黑夜途径序列4“守夜人”。'},
 {'kind':'sequence','value':'看门人','source':'《诡秘之主》第一部，第二百一十章《故事》','note':'死神途径，晋升前的阶段。'},
 {'kind':'sequence','value':'守夜人','source':'《诡秘之主》第一部，第二百一十章《故事》','note':'黑夜途径，跨途径晋升后的阶段。'}
]
classification_evidence['roselle'] = [
 {'kind':'pathway','value':'黑皇帝','source':'《宿命之环》第五部，第一百二十九章《漩涡的中心》','note':'后期由窥秘人途径强行转向律师途径；早期曾选择通识者序列。'},
 {'kind':'sequence','value':'通识者','source':'《诡秘之主》第一部，第六十五章《非凡者资料》','note':'早期所选序列，不代表其后期途径。'},
 {'kind':'pathway','value':'隐者','source':'《宿命之环》第五部，第一百二十九章《漩涡的中心》','note':'转向律师途径之前的窥秘人途径阶段。'}
]
classification_evidence.setdefault('valentine', []).append({
 'kind':'pathway','value':'太阳','certainty':'inferred','source':'《宿命之环》第一部，第八十二章《梦境占卜》',
 'note':'奥萝尔根据能力表现推测其途径及序列7“太阳神官”；两者均为人物判断。'
})
classification_evidence.setdefault('ryan', []).append({
 'kind':'pathway','value':'黄昏巨人','certainty':'inferred',
 'source':'《宿命之环》第一部，第八十二章《梦境占卜》',
 'note':'奥萝尔根据莱恩的表现推测他是“黎明骑士”，据此归入对应途径；具体序列尚属推测。'
})
classification_evidence.setdefault('lanervus', []).append({
 'kind':'pathway','value':'错误',
 'source':'《诡秘之主》第二部，第七十四章《死战》',
 'note':'原文说明其途径的序列9是“偷盗者”；具体序列8“诈骗师”仍是克莱恩的推测。'
})
classification_evidence.setdefault('qunas', []).append({
 'kind':'pathway','value':'黑皇帝','source':'《诡秘之主》第四部，第一百六十一章《头发般的植物》',
 'note':'原文称其实际已是律师（黑皇帝）途径的半神，公开身份低于实际序列。'
})
for ident, sequence in [('katy_guard','审讯者'), ('park_guard','治安官')]:
 classification_evidence.setdefault(ident, []).append({
  'kind':'pathway','value':'审判者',
  'source':'《诡秘之主》第二部，第一百六十八章《猜测》',
  'note':f'克莱恩从非凡特性判断其为“{sequence}”，属于仲裁人途径。'
 })
classification_evidence.setdefault('lia', []).append({
 'kind':'pathway','value':'愚者','certainty':'inferred',
 'source':'《宿命之环》第一部，第八十二章《梦境占卜》',
 'note':'奥萝尔根据能力表现推测她属于占卜家途径、至少为“魔术师”。'
})
classification_evidence.setdefault('azik', []).append({
 'kind':'pathway','value':'死神','certainty':'inferred',
 'source':'《诡秘之主》第一部，第一百七十六章《信》；第三部，第一百零六章《旧相识》',
 'note':'克莱恩根据阿兹克与死神的关联及其能力判断他极可能属于收尸人途径；后来知晓他曾是“死亡执政官”。'
})
classification_evidence.setdefault('medici', []).append({
 'kind':'pathway','value':'红祭司','source':'《诡秘之主》第三部，第三十四章《“倒吊人”的猜测》',
 'note':'塔罗会上克莱恩回答梅迪奇属于红祭司途径；恶灵阶段与索伦、艾因霍恩的残魂交织。'
})
classification_evidence.setdefault('dorian', []).append({
 'kind':'sequence','value':'占星人',
 'source':'《诡秘之主》第六部，第五十七章《多里安的决断》',
 'note':'原文以“占星人”的灵性直觉描述多里安；此序列属于学徒途径。'
})
classification_evidence.setdefault('chained_god', []).append({
 'kind':'pathway','value':'被缚者','source':'《宿命之环》第三部，第三十八章《恶魔》；《诡秘之主》第六部，第八十四章《“降临”的投影》',
 'note':'原文称其属于“囚犯”或“异种”途径；其后受到欲望母树侵蚀。'
})
classification_evidence.setdefault('simon', []).extend([
 {'kind':'organization','value':'萨瓦党','source':'《宿命之环》第二部，第四十七章《房东》'},
 {'kind':'pathway','value':'黄昏巨人','certainty':'inferred','source':'《宿命之环》第二部，第七十一章《偷懒》','note':'卢米安怀疑西蒙是战士途径的非凡者，具体序列尚待核实。'}
])
classification_evidence.setdefault('utravsky', []).append({
 'kind':'organization','value':'大地母神教会','source':'《诡秘之主》第二部，第九十三章《“巨人”主教》'
})
classification_evidence.setdefault('guillaume', []).append({
 'kind':'pathway','value':'宿命','source':'《宿命之环》第三部，第六十九章《“罪人”》',
 'note':'原文提及他获得相当于序列5“猎命师”的恩赐；是否服用对应魔药在较早情节中尚不确定。'
})
classification_evidence.setdefault('rayasa', []).extend([
 {'kind':'pathway','value':'死神','source':'《宿命之环》第四部，第一百八十九章《两个回答》','note':'卢米安认出雷亚萨是死神途径的中序列非凡者。'},
 {'kind':'organization','value':'灵教团皇室派','source':'《宿命之环》第四部，第一百九十五章《死亡的乐章》、第二百零四章《罪在何处》','note':'麦斯洛说明两人同属灵教团；卢米安后来说明两人属于皇室派。'}
])
classification_evidence.setdefault('maislo', []).append({
 'kind':'organization','value':'灵教团皇室派','source':'《宿命之环》第四部，第一百九十五章《死亡的乐章》、第二百零四章《罪在何处》',
 'note':'麦斯洛坦承他与雷亚萨同属灵教团；卢米安后来说明两人属于皇室派。'
})
classification_evidence.setdefault('lolotta', []).extend([
 {'kind':'pathway','value':'死神','source':'《诡秘之主》第一部，第七十一章《滞涩现象》','note':'邓恩介绍洛络塔为序列8“掘墓人”，属于收尸人途径。'},
 {'kind':'organization','value':'值夜者','source':'《诡秘之主》第一部，第七十一章《滞涩现象》','note':'来自贝克兰德教区，协助廷根值夜者执行任务。'}
])
classification_evidence['bilt'] = [{'kind':'organization','value':'冒险家互助会','source':'《诡秘之主》第三部，第一百三十二章《冒险家互助会》'}]
classification_evidence['bouvoir'] = [
 {'kind':'organization','value':'罪人','source':'《宿命之环》第三部，第六十九章《“罪人”》、第一百八十一章《“罪人”们的首领》'},
 {'kind':'pathway','value':'宿命','source':'《宿命之环》第三部，第一百七十九章《扮演的机会》','note':'保利娜称布瓦尔已获“苦修士”恩赐，仍在争取“猎命师”。'}
]
classification_evidence['beatrice'] = [{'kind':'organization','value':'至福会','source':'《宿命之环》第三部，第一百五十五章《碧翠丝》'}]
classification_evidence.setdefault('ozil', []).append({
 'kind':'pathway','value':'黄昏巨人',
 'source':'《诡秘之主》第三部，第一百一十八章《清场》',
 'note':'克莱恩击杀奥兹尔后取得战士途径序列8格斗家非凡特性。'
})
classification_evidence.setdefault('stafford', []).append({
 'kind':'pathway','value':'审判者',
 'source':'《诡秘之主》第五部，第七十六章《答案》、第九十一章《格尔曼的问题》',
 'note':'原文称斯特福德依靠惩戒骑士的身体支撑；惩戒骑士属于仲裁人途径序列5。'
})
classification_evidence.setdefault('basil_pirate', []).append({
 'kind':'pathway','value':'深渊','source':'《宿命之环》第五部，第四十八章《上船》',
 'note':'卢米安确认“拆骨者”罗勒是恶魔；该序列属于深渊途径。'
})
classification_evidence.setdefault('hal_constantine', []).append({
 'kind':'pathway','value':'暴君','certainty':'inferred',
 'source':'《宿命之环》第五部，第四十八章《上船》',
 'note':'卢米安根据此前表现推测哈尔接近风暴途径序列5“海洋歌者”，具体序列仍待确认。'
})
classification_evidence['sharf'] = [
 {'kind':'pathway','value':'通识者','source':'《诡秘之主》第四部，第一百七十章《阴影》；第二部，第六十章《出手配方》','note':'夏尔夫被称为工匠；原文说明工匠是通识者途径序列6。'},
 {'kind':'nationality','value':'因蒂斯','source':'《诡秘之主》第四部，第一百八十章《“工匠”的来历》','note':'阿尔杰向嘉德丽雅介绍夏尔夫是因蒂斯人。'}
]
classification_evidence['kaslana'] = [{'kind':'pathway','value':'审判者','certainty':'inferred','source':'《诡秘之主》第二部，第二百零六章《心愿》','note':'克莱恩判断她属于仲裁人途径，艾辛格肯定了他的观察；对话没有点明序列。'}]
classification_evidence['carlson'] = [{'kind':'organization','value':'机械之心','source':'《诡秘之主》第二部，第二百零七章《恶魔家族》','note':'伊康瑟询问现场发现时，叙述明确称卡尔森为机械之心队员。'}]
classification_evidence.setdefault('leomaster', []).append({'kind':'organization','value':'极光会','source':'《诡秘之主》第三部，第一百七十二章《囚犯与看守》、第一百八十九章《第四个名字》'})
classification_evidence.setdefault('hilbert', []).append({'kind':'organization','value':'心理炼金会','source':'《诡秘之主》第二部，第二百零四章《阿罗德斯》；第五部，第二十四章《募捐的天赋》'})
classification_evidence.setdefault('kisma', []).append({'kind':'pathway','value':'倒吊人','certainty':'inferred','source':'《诡秘之主》第六部，第四十六章《“丑小鸭”》','note':'原文描写克斯玛放牧灵魂，并解释牧羊人和三首圣堂的相关能力；据此推断为秘祈人途径，具体序列应另行核查。'})
classification_evidence.setdefault('mr_a', []).append({'kind':'pathway','value':'倒吊人','source':'《诡秘之主》第四部，第一百零四章《“投食”》','note':'克莱恩提及A先生具有“蔷薇主教”的能力；该序列属于秘祈人途径。'})
# Explicit nationality descriptions in the cited chapters; do not infer from residence.
for ident, facts in {
 'klein': [('塔罗会','《诡秘之主》第一部，第七章《代号》'), ('廷根市占卜俱乐部','《诡秘之主》第一部，第四十八章《海纳斯·凡森特》')],
 'audrey': [('心理炼金会','《诡秘之主》第二部，第二百零五章《心灵的力量》'), ('鲁恩慈善助学基金','《诡秘之主》第五部，第二十四章《募捐的天赋》')],
 'leonard': [('红手套','《诡秘之主》第二部，第一百八十九章《挖掘》'), ('塔罗会','《诡秘之主》第五部，第十三章《新人和新人也是不一样的》')],
 'ryan': [('机械之心','《宿命之环》第一部，第八十章《联合调查组》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'lia': [('第八局','《宿命之环》第一部，第八十章《联合调查组》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'valentine': [('永恒烈阳教会宗教裁判所','《宿命之环》第一部，第一百零八章《报告》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'alger': [('风暴教会','《诡秘之主》第一部，第一百七十章《铜哨》'), ('海神教会','《诡秘之主》第七部总结之后，第六章《选择》')],
 'fors': [('塔罗会','《诡秘之主》第二部，第九十七章《大气污染调查委员会》')],
 'xio': [('塔罗会','《诡秘之主》第五部，第十章《门后的东西》'), ('军情九处','《诡秘之主》第七部总结之后，第一章《这一晚》')],
 'emlyn': [('丰收教堂','《诡秘之主》第二部，第一百五十五章《不按常理出牌》'), ('塔罗会','《诡秘之主》第二部，第二百五十五章《月亮》')],
 'sharron': [('玫瑰学派','《诡秘之主》第二部，第一百一十七章《莎伦和马里奇的理念》'), ('节制派','《诡秘之主》第四部，第一百四十六章《阿罗德斯的问题》')],
 'maric': [('玫瑰学派','《诡秘之主》第二部，第一百一十七章《莎伦和马里奇的理念》')],
 'lumian': [('萨瓦党','《宿命之环》第二部，第七十章《大餐》'), ('塔罗会','《宿命之环》第三部，第二章《大阿卡那牌们》')],
 'alhasson': [('值夜者','《诡秘之主》第一部，第七十一章《滞涩现象》')],
 'soest': [('红手套','《诡秘之主》第二部，第一百八十九章《挖掘》')],
 'shermane': [('魔女教派','《诡秘之主》第一部，第一百九十九章《“投骰”成功》')],
 'acesnake': [('风暴教会','《诡秘之主》第一部，第一百九十一章《动机不明》')],
}.items():
 for value, source in facts:
  classification_evidence.setdefault(ident, []).append({'kind':'organization','value':value,'source':source})
for ident, source in {
 'lumian':'《宿命之环》第二部，第七十章《大餐》',
 'jenna':'《宿命之环》第三部，第四十三章《矛盾感》',
 'danitz':'《宿命之环》第三部，第二十八章《大人物》',
 'roselle':'《诡秘之主》第二部，第二十二章《忙碌的周一》',
}.items():
 classification_evidence.setdefault(ident, []).append({'kind':'nationality','value':'因蒂斯','source':source})
progressions = json.loads((root/'tools/character-progression.json').read_text(encoding='utf-8'))
for entry in out:
 entry['matchNote'] = match_notes.get(entry['id'], '')
 entry['aliasSources'] = identity_sources.get(entry['id'], [])
 entry['classificationEvidence'] = classification_evidence.get(entry['id'], [])
 progression = progressions.get(entry['id'])
 if progression:
  entry['progression'] = progression
 if entry['id'] == 'sharf':
  entry['alias'] = '工匠夏尔夫'
  entry['aliasSources'].append({'alias':'姓朱恩','source':'《诡秘之主》第四部，第一百九十一章《后遗症》'})
  entry['matchNote'] = '仅统计“夏尔夫”字面出现，单独的“工匠”未计入。'
 if entry['id'] == 'djinni':
  entry['matchNote'] = '仅统计“灯神”字面出现；神灯这一物品名称未直接计入。'
 if entry['id'] == 'pallez':
  entry['alias'] = '老头（伦纳德的称呼）'
  entry['aliasSources'].append({'alias':'老头（伦纳德的称呼）','source':'《诡秘之主》第四部，第一百四十五章《谁的陷阱》'})
  entry['matchNote'] = '仅统计“帕列斯”；“老头”等称呼存在歧义，未并入字面计数。'
 if entry['id'] == 'sherman':
  entry['alias'] = '雪曼'
  entry['aliasSources'].append({'alias':'雪曼','source':'《诡秘之主》第五部，第七十六章《答案》'})
  entry['matchNote'] = '合计谢尔曼、雪曼两种称呼的字面出现；仍需逐处核对具体指代。'
 if entry['id'] == 'stafford':
  entry['matchNote'] = '统计“斯特福德”字面出现，仍需逐处核对可能的同名或间接提及。'
 if entry['id'] == 'ozil':
  entry['alias'] = '巨力士'
  entry['aliasSources'].append({'alias':'巨力士','source':'《诡秘之主》第三部，第一百零二章《锅》'})
 if entry['id'] == 'sothos_young':
  entry['matchNote'] = '排除“特伦索托斯特”等含相近字串的称呼。'
 if entry['id'] == 'mithor':
  entry['alias'] = '巧言者'
  entry['aliasSources'].append({'alias':'巧言者','source':'《诡秘之主》第三部，第九十八章《巧言者》'})
  entry['matchNote'] = '按姓名计数，排除阿德米索尔。'
 if entry['id'] == 'paulina':
  entry['alias'] = '调味品美人'
  entry['aliasSources'].append({'alias':'调味品美人','source':'《宿命之环》第三部，第六十一章《孰真孰假》'})
 if entry['id'] == 'beatrice':
  entry['alias'] = '曾冒充画商德丽莎'
  entry['aliasSources'].append({'alias':'冒充德丽莎','source':'《宿命之环》第三部，第一百五十五章《碧翠丝》'})
  entry['matchNote'] = '排除“碧翠丝的项链”和“碧翠丝项链”的物品名称。'
 if entry['id'] == 'pallas_negan':
  entry['alias'] = '尼根公爵（遇刺前在任）'
  entry['aliasSources'].append({'alias':'尼根公爵','source':'《诡秘之主》第一部，第八章《新的时代》；第四部，第九章《管家》'})
  entry['matchNote'] = '前两部截至《玫瑰花下》计本名和爵号，含府邸等间接提及；此后仅计全名，以免把继位的长子算入。'
 if entry['id'] == 'steam_god':
  entry['alias'] = '工匠之神（旧称）'
  entry['matchNote'] = '仅统计“蒸汽与机械之神”字面命中，其中包括教会名称等间接提及；旧称“工匠之神”未纳入计数。'
 if entry['id'] == 'leomaster':
  entry['alias'] = '黑之圣者'
  entry['aliasSources'].append({'alias':'黑之圣者','source':'《诡秘之主》第三部，第一百八十九章《第四个名字》'})
  entry['matchNote'] = '统计“利奥马斯特”和“黑之圣者”的字面匹配，邻接的称号和姓名只计一次；不同人格未分开统计。'
 if entry['id'] == 'hilaire':
  entry['alias'] = '橘光 / 赫尔莫修因曾自称希拉里昂'
  entry['aliasSources'].append({'alias':'橘光；赫尔莫修因曾自称希拉里昂','source':'《诡秘之主》第三部，第二百四十一章《今天又做了件好事》、第二百四十二章《提醒的真正含义》'})
  entry['matchNote'] = '仅统计“希拉里昂”；“橘光”与赫尔莫修因的名字未并入计数。'
 if entry['id'] == 'omabella':
  entry['matchNote'] = '“欧弥贝拉”可能指古代丰收女神、以此名出现的神子或莉莉丝所窃取的身份；现有字面计数未逐处区分这些指代，神子与古代人物的具体关系尚待核实。'
 if entry['id'] == 'ikance':
  entry['name'] = '伊康瑟·伯纳德'
  entry['aliasSources'].append({'alias':'伊康瑟·伯纳德','source':'《诡秘之主》第二部，第二百零三章《正正得负》'})
 if entry['id'] == 'vermonda':
  entry['alias'] = '佛蒙达·索伦'
  entry['aliasSources'].append({'alias':'佛蒙达·索伦','source':'《宿命之环》第三部，第七十八章《支系》、第八十章《反馈》'})
 if entry['id'] == 'drag_gail':
  entry['alias'] = '多拉格·盖尔（原文异写）'
  entry['aliasSources'].append({'alias':'多拉格·盖尔（原文异写）','source':'《诡秘之主》第二部，第三十章《捉奸》、第三十三章《奇怪的预兆》'})
  entry['matchNote'] = '合计“多拉古”和“多拉格”的字面匹配；其他同名用法仍需核查。'
 if entry['id'] == 'mary_short':
  entry['alias'] = '玛丽·盖尔 / 玛丽夫人'
  entry['aliasSources'].append({'alias':'玛丽·盖尔','source':'《诡秘之主》第二部，第二十九章《贝克朗》；第四部，第六十一章《意外的来访者》'})
  entry['matchNote'] = '包含两种完整姓名和“玛丽夫人”“玛丽太太”的字面匹配；后两种称呼可能混入同名人物，尚未逐处消歧。'
 if entry['id'] == 'basil_pirate':
  entry['alias'] = '拆骨者'
  entry['aliasSources'].append({'alias':'拆骨者','source':'《宿命之环》第四部，第十八章《奇特的海盗船》'})
  entry['matchNote'] = '仅统计“拆骨者”称号；“罗勒”也可指植物或其他人物，未直接纳入计数。'
 if entry['id'] == 'hisoka':
  entry['name'] = '特瓦纳科·图皮安'
  entry['alias'] = '“西索”'
  entry['aliasSources'].append({'alias':'“西索”','source':'《宿命之环》第四部，第一百五十四章《团队合作》'})
  entry['matchNote'] = '合计“西索”和“特瓦纳科”的字面匹配；代号与姓名连写只计一次，其他同名用法仍需核查。'
 if entry['id'] == 'park_guard':
  entry['matchNote'] = '统计“帕克”的字面匹配；同名人物仍需逐处核查。'
 if entry['id'] == 'katy_guard':
  entry['matchNote'] = '排除瑞尔·比伯母亲凯蒂·斯蒂芬娜的完整姓名；其他同名指代仍需逐处核查。'
 if entry['id'] == 'essinger':
  entry['name'] = '艾辛格·斯坦顿'
  entry['alias'] = '斯坦顿 / “智慧之眼”'
  entry['aliasSources'].append({'alias':'斯坦顿先生','source':'《诡秘之主》第二部，第五十八章《金玫瑰》、第五十九章《互相观察》'})
  entry['aliasSources'].append({'alias':'“智慧之眼”','source':'《诡秘之主》第二部，第二百零二章《戒指》、第二百二十一章《陵墓和悬赏》'})
  entry['matchNote'] = '合计完整姓名、“艾辛格”“斯坦顿”和带引号的“智慧之眼”，部分相邻写法合并计数；姓氏和代号的其他用法仍需消歧。'
 if entry['id'] == 'philip_general':
  entry['matchNote'] = '统计“腓力”的字面匹配；同名人物及回忆中的称谓仍需逐处消歧。'
 if entry['id'] == 'gardner':
  entry['matchNote'] = '统计“加德纳”的字面匹配，包含现实人物、镜中人及可能的其他指代；不能与镜中人的部分计数相加。'
 if entry['id'] == 'morane':
  entry['matchNote'] = '统计“莫兰”的字面匹配，包含原人物、冒名的镜中人及可能的其他指代；不能与镜中人条目的次数相加。'
 if entry['id'] == 'roche':
  entry['matchNote'] = '洛希与奥萝尔曾关联同一身体；这里保留不同灵的条目，具体指代和身份仍需逐章核查。'
 if entry['id'] == 'louis_wien':
  entry['alias'] = 'X先生'
  entry['aliasSources'].append({'alias':'X先生','source':'《诡秘之主》第四部，第四十九章《负面效果》、第一百一十三章《回归》'})
  entry['matchNote'] = '统计“维恩”和“X先生”字面匹配；称号可由后继神使使用，部分上下文及其他同名用法需人工消歧。'
 if entry['id'] == 'alista':
  entry['alias'] = '血皇帝'
  entry['aliasSources'].append({'alias':'血皇帝','source':'《宿命之环》第三部，第二十一章《入会》'})
  entry['matchNote'] = '统计“亚利斯塔”和“血皇帝”，紧邻的称号与名字合并为一次；仅称“图铎”的歧义用法未计入。'
 if entry['id'] in {'edwina','senor','qilangos'}:
  title={'edwina':'冰山中将','senor':'血之上将','qilangos':'飓风中将'}[entry['id']]
  entry['alias'] = title
  entry['aliasSources'].append({'alias':title,'source':'《诡秘之主》第二部，第七十九章《交流消息》' if entry['id'] != 'qilangos' else '《诡秘之主》第一部，第一百四十五章《合作的请求》'})
  entry['matchNote'] = '统计名字和称号，紧邻的称号与名字合并为一次；其他含糊指代仍需核对。'
 if entry['id'] == 'sasrir':
  entry['alias'] = '暗天使 / 萨斯列尔（原文异写）'
  entry['aliasSources'].append({'alias':'暗天使','source':'《诡秘之主》第三部，第一百八十五章《祷文》'})
  entry['aliasSources'].append({'alias':'萨斯列尔（原文异写）','source':'《诡秘之主》第三部，第一百八十六章《自信也许是缺点》'})
  entry['matchNote'] = '统计“萨斯利尔”“萨斯列尔”与“暗天使”；紧邻的称号和名字合并为一次，其余称号指代仍需逐处核查。'
 if entry['id'] == 'heraberg':
  entry['matchNote'] = '仅统计《宿命之环》的“赫拉贝格”；他是摩罗拉的人偶形态神职人员，与名字相似的赫拉伯根暂不合并。'
 if entry['id'] == 'salistes':
  entry['matchNote'] = '仅统计《宿命之环》中的莎莉丝特；《诡秘之主》中老尼尔提及同名者，未将其合并或计入。'
 if entry['id'] == 'christina':
  entry['matchNote'] = '统计“克里斯蒂娜”的字面出现；其他可能的同名用法仍需逐处核查。'
 if entry['id'] == 'mr_z':
  entry['matchNote'] = '极光会神使代号可由继任者使用；不同章节的称呼是否为同一人仍需核查，字面统计未按任职时期拆分。'
 if entry['id'] == 'mr_a':
  entry['matchNote'] = '“A先生”是极光会神使的代号，可能由继任者使用；统计未按身份时期拆分。'
 if entry['id'] == 'kisma':
  entry['alias'] = '幽暗圣者'
  entry['aliasSources'].append({'alias':'幽暗圣者','source':'《诡秘之主》第六部，第四十四章《狮子搏兔》'})
  entry['matchNote'] = '仅统计“克斯玛”的字面匹配；称号“幽暗圣者”未计入，避免相邻称号与名字重复计算。'
 if entry['id'] == 'butis':
  entry['alias'] = '秘之圣者'
  entry['aliasSources'].append({'alias':'秘之圣者','source':'《诡秘之主》第五部，第一百三十章《多里安的请求》'})
  entry['matchNote'] = '仅统计“布提斯”的字面匹配；称号“秘之圣者”未计入，其他同名用法仍需核查。'
 if entry['id'] == 'hal_constantine':
  entry['alias'] = '深海上将 / 深海中将'
  entry['aliasSources'].append({'alias':'深海中将','source':'《诡秘之主》第二部，第七十九章《交流消息》'})
  entry['aliasSources'].append({'alias':'深海上将','source':'《宿命之环》第四部，第十八章《奇特的海盗船》'})
  entry['matchNote'] = '仅统计“哈尔”的字面写法，同名人物和其他用法尚需消歧；称号未计入。'
 if entry['id'] == 'roselle':
  entry['matchNote'] = '统计“罗塞尔”和“黄涛”，排除“格罗塞尔”中的同名字串；梦境形象等语境仍需人工区分。'
 if entry['id'] == 'canos':
  entry['matchNote'] = '排除“托斯卡诺”中的同名字串；其他同名用法仍需核查。'
 if entry['id'] == 'trissy':
  entry['alias'] = '特里斯 / 特莉丝奇克'
  entry['aliasSources'].append({'alias':'特莉丝奇克','source':'《诡秘之主》第二部，第二百五十七章《名字》'})
  entry['matchNote'] = '统计“特里斯”和“特莉丝”的字面匹配；完整名“特莉丝奇克”通过其中的“特莉丝”计入一次，其他同名用法仍需核查。'
 if entry['id'] == 'franca':
  entry['alias'] = '芙兰卡·罗兰 / “红靴子” / 查内姆 / “袖剑” / 罗芙（梦境假名）'
  entry['aliasSources'].append({'alias':'芙兰卡·罗兰','source':'《宿命之环》第三部，第一百三十五章《人血面包》'})
  entry['aliasSources'].append({'alias':'红靴子','source':'《宿命之环》第二部，第六十五章《奖赏》'})
  entry['aliasSources'].append({'alias':'查内姆','source':'《宿命之环》第四部，第七十一章《可能的突破口》；第八十二章《“宫殿”》'})
  entry['aliasSources'].append({'alias':'袖剑（研究会代号）','source':'《宿命之环》第二部，第六十六章《“袖剑”》'})
  entry['aliasSources'].append({'alias':'罗芙（梦境假名）','source':'《宿命之环》第六部，第二十九章《一种象征》'})
  entry['matchNote'] = '统计“芙兰卡”“查内姆”“红靴子”“袖剑”和梦境假名“罗芙”；称号与名字连写只计一次，“袖剑”仅统计带双引号的写法，梦境经历与现实经历需区分。'
 if entry['id'] in {'hidden_sage','mother_tree','great_mother'}:
  entry['matchNote'] = '以原文中的称号建档，统计该称号的字面出现；其他称号及不同语境尚未合并。'
 if entry['id'] in {'mother_tree','great_mother'}:
  entry['alias'] = '原始月亮（部分信仰可能指向）'
  entry['aliasSources'].append({'alias':'原始月亮（依具体信仰对象区分）','source':'《宿命之环》第五部，第二十四章《灵性直觉》'})
  entry['matchNote'] = '仅统计该条目的主要称号；“原始月亮”在不同语境可能指向不同存在，未合并计数。'
 if entry['id'] == 'chained_god':
  entry['matchNote'] = '以“被缚之神”称号统计；早期有关欲望母树化身的说法与后期揭示的关系不同，未将两个称号合并计数。'
 if entry['id'] == 'suah':
  entry['alias'] = '神孽 / 神之子'
  entry['aliasSources'].append({'alias':'神之子；神孽','source':'《诡秘之主》第五部，第九十五章《王女》'})
  entry['matchNote'] = '只统计“斯厄阿”；“神孽”和“神之子”可能指其他存在，暂未合并计数。'
 if entry['id'] == 'agaritu':
  entry['alias'] = '不死之王 / 无信者'
  entry['aliasSources'].append({'alias':'不死之王 / 无信者','source':'《诡秘之主》第三部，第一百六十二章《笑声》'})
  entry['matchNote'] = '合并“阿加里图”和“不死之王”的字面匹配；相邻称号与名字计为一次，“无信者”尚未计入。'
 if entry['id'] == 'simon':
  entry['alias'] = '巨人（萨瓦党绰号）'
  entry['aliasSources'].append({'alias':'巨人（萨瓦党绰号）','source':'《宿命之环》第二部，第四十七章《房东》'})
  entry['matchNote'] = '仅统计《宿命之环》中“西蒙”的字面匹配；“巨人”可能指种族或其他人物，未计入。'
 if entry['id'] == 'luka':
  entry['alias'] = '卢卡·布鲁斯特'
  entry['aliasSources'].append({'alias':'卢卡·布鲁斯特','source':'《诡秘之主》第五部，第一百五十三章《1368》'})
  entry['matchNote'] = '统计“卢卡”的字面匹配；其他同名用法仍需逐处核查。'
 if entry['id'] == 'utravsky':
  entry['alias'] = '乌特拉夫斯基神父 / 丰收教堂主教'
  entry['aliasSources'].append({'alias':'丰收教堂主教','source':'《诡秘之主》第二部，第九十三章《“巨人”主教》'})
  entry['matchNote'] = '统计“乌特拉夫斯基”的字面出现；“神父”和“主教”等单独称谓未计入。'
 if entry['id'] == 'mistral':
  entry['alias'] = '米斯特拉尔伯爵'
  entry['aliasSources'].append({'alias':'米斯特拉尔伯爵','source':'《诡秘之主》第五部，第五十五章《第一乐章》'})
  entry['matchNote'] = '统计“米斯特拉尔”的字面出现；“伯爵”等单独称谓未计入。'
 if entry['id'] == 'aurore':
  entry['alias'] = '麻瓜（研究会代号）'
  entry['aliasSources'].append({'alias':'麻瓜（研究会代号）','source':'《宿命之环》第一部，第四十八章《知识逐人》'})
  entry['matchNote'] = '仅统计“奥萝尔”的字面写法；“麻瓜”也曾被卢米安冒用，暂未直接计入。'
 if entry['id'] == 'klein':
  entry['alias'] += ' / 愚者 / 世界（塔罗会身份）'
  entry['aliasSources'].append({'alias':'愚者（塔罗会身份）','source':'《诡秘之主》第一部，第七章《代号》'})
  entry['aliasSources'].append({'alias':'世界（塔罗会身份）','source':'《诡秘之主》第二部，第五十一章《五人聚会》'})
  entry['matchNote'] = '统计克莱恩、周明瑞及列出的部分身份姓名；“愚者”“世界”具有其他含义或指代，暂未直接计入。'
 if entry['id'] == 'green_dream':
  entry['matchNote'] = '“格林”字面匹配可能包括其他人名或地名；《宿命之环》中主要出现的是罗塞尔追随者格林的梦境形象。'
 if entry['id'] == 'jiangyue_dream':
  entry['matchNote'] = '江月出现在梦境都市，不能据此认定现实中存在对应人物。'
 if entry['id'] == 'charlie':
  entry['matchNote'] = '只统计《宿命之环》第二部及之后的“查理”；排除《诡秘之主》的查理·雷克和第一部科尔杜村的同名男仆，其他同名用法仍需核查。'
 if entry['id'] == 'wendell':
  entry['matchNote'] = '排除了“文德尔街”的字面命中；其他同名用法仍需核查。'
 if entry['id'] == 'bernadette':
  entry['alias'] += ' / 黄贝贝（梦境称呼）'
  entry['aliasSources'].append({'alias':'黄贝贝（梦境称呼）','source':'《宿命之环》第六部，第二十一章《初来乍到》'})
  entry['matchNote'] = '包含“贝尔纳黛”“神秘女王”和梦境称呼“黄贝贝”；称号与姓名连写只计一次，梦境与现实情节需区分。'
 if entry['id'] == 'jenna':
  entry['alias'] = '切莉娅·贝洛 / 切莉娅 / “小婊子”（舞台绰号） / “浮夸女”（表演身份）'
  entry['aliasSources'].append({'alias':'切莉娅·贝洛（真名）','source':'《宿命之环》第二部，第一百三十章《灭火》'})
  entry['aliasSources'].append({'alias':'“小婊子”（舞台绰号）','source':'《宿命之环》第二部，第四十六章《简娜》'})
  entry['aliasSources'].append({'alias':'“浮夸女”（表演身份）','source':'《宿命之环》第二部，第五十三章《新鲜的尸体》'})
  entry['matchNote'] = '合计“简娜”“切莉娅”和带双引号的舞台绰号“小婊子”；绰号与姓名连写只计一次。“浮夸女”也泛指其他表演者，尚未直接计入；其他同名用法仍需核查。'
 if entry['id'] == 'julien_jenna':
  entry['matchNote'] = '只统计《宿命之环》中的“朱利安”；《诡秘之主》中有同名的萨默尔家女仆。其他同名用法仍需核查。'
 if entry['id'] == 'patrick':
  entry['matchNote'] = '该名称涉及人皮伪装与误导；调查者一度将其与“欲望使徒”混为一人，后续揭示是两个人。字面次数没有区分使用者。'
 if entry['id'] == 'jason':
  entry['matchNote'] = '统计“欲望使徒”的字面出现，其中可能包括序列名称或其他使用者；帕特里克·杰森·贝利亚涉及两人的误导性身份，未作为此人的确定姓名。'
 if entry['id'] == 'lanervus':
  entry['alias'] = '曾使用埃尔这个假名'
  entry['aliasSources'].append({'alias':'埃尔（假名）','source':'《诡秘之主》第一部，第一百七十四章《雪伦夫人》'})
  entry['matchNote'] = '仅统计“兰尔乌斯”；“埃尔”容易与其他人名或词语混淆，未纳入字面次数。'
 if entry['id'] == 'mahti_mori':
  entry['matchNote'] = '统计“莫里·马赫特”和“马赫特议员”；单独出现的姓氏未计入。'
 if entry['id'] in {'mountbatten','byers','luka','jasmin','nikira','madame_michel','ruhr','bram'}:
  entry['matchNote'] = '按名字字面统计，可能包括同名人物或其他用法，仍需逐处消歧。'
 if entry['id'] == 'xu_xinyang':
  entry['matchNote'] = '徐新阳出现于梦境都市，不能据此认定现实中存在对应人物。'
 if entry['id'] == 'antigonus':
  entry['alias'] = '安小天（梦境形象）'
  entry['aliasSources'].append({'alias':'安小天（对应梦境形象）','source':'《宿命之环》第六部，第八十七章《往事》'})
  entry['matchNote'] = '统计“安小天”及排除紧随“家族”“笔记”的“安提哥努斯”；其他家族、遗物语境仍可能混入。梦境形象不等同于本人。'
 if entry['id'] == 'frank':
  entry['alias'] = '李克己（梦境形象；原文文件亦作李克已）'
  entry['aliasSources'].append({'alias':'李克己（对应梦境形象）','source':'《宿命之环》第六部，第七十六章《精神病科》'})
  entry['matchNote'] = '包含“弗兰克”及其梦境形象“李克己”“李克已”的字面匹配；后者为所提供原文文件中的异写，梦境经历与现实经历需区分。“弗兰克”可能有其他同名用法。'
 if entry['id'] == 'lumian':
  entry['alias'] += ' / 李明（梦境假名） / 卢米安娜（梦境形象）'
  entry['aliasSources'].append({'alias':'李明（梦境假名）','source':'《宿命之环》第六部，第三十六章《宛若真实》'})
  entry['aliasSources'].append({'alias':'卢米安娜（梦境形象）','source':'《宿命之环》第六部，第九十八章《利用漏洞》、第一百零四章《父女》'})
  entry['matchNote'] = '含“卢米安”“路易·贝里”“夏尔·杜布瓦”和梦境假名“李明”；“卢米安娜”因包含“卢米安”而计入，已排除姓名与“明明”连写产生的“李明”误匹配；梦境形象需与现实经历区分；单独的“夏尔”尚未计入。'
 if entry['id'] == 'anthony':
  entry['alias'] = '安瑞德（梦境假名）'
  entry['aliasSources'].append({'alias':'安瑞德（梦境假名）','source':'《宿命之环》第六部，第三十九章《价格》'})
  entry['matchNote'] = '统计“安东尼”和梦境假名“安瑞德”的字面出现；安东尼存在同名人物，其他同名语境仍需核查，梦境经历与现实经历需区分。'
 if entry['id'] == 'ludwig':
  entry['alias'] = '李路（梦境称呼）'
  entry['aliasSources'].append({'alias':'李路（梦境称呼）','source':'《宿命之环》第六部，第九十六章《一起》、第九十七章《收尾环节》'})
  entry['matchNote'] = '合计“路德维希”和梦境称呼“李路”的字面出现；梦境身份与现实经历需区分，其他同名或词语重叠仍需核查。'
 if entry['id'] == 'zarath':
  entry['alias'] = '查拉图斯特拉（梦境称呼）'
  entry['aliasSources'].append({'alias':'查拉图斯特拉（梦境称呼）','source':'《宿命之环》第七部，第二十八章《任务》'})
  entry['matchNote'] = '合计“查拉图”和梦境称呼“查拉图斯特拉”的字面出现，长称呼不重复计算；家族及其他同名语境仍需消歧，梦境经历与现实经历需区分。'
 if entry['id'] == 'zarathustra':
  entry['matchNote'] = '主要记录梦境都市中的查拉图斯特拉；与其他同名或相似称呼的身份关系须逐章核对。'
 if entry['id'] == 'nikira':
  entry['matchNote'] = '尼基拉的身份曾被镜中人格里菲斯替换，字面次数未区分本人及冒名者；与格里菲斯的部分计数重叠。'
 if entry['id'] == 'bayenna':
  entry['alias'] = '“食肉动物”酒吧原老板兼厨师'
  entry['aliasSources'].append({'alias':'“食肉动物”酒吧老板兼厨师','source':'《宿命之环》第五部，第六十三章《聘请》'})
  entry['matchNote'] = '统计全书“拜恩纳”与第五部第六十一、六十二章中明确指他的“酒吧老板”；未统计单独的“老板”、其他称呼或代词，是已核对范围内的下限。'
 if entry['id'] == 'guy':
  entry['alias'] = '镜中人（以格伊为名）'
  entry['aliasSources'].append({'alias':'镜中人（以格伊为名）','source':'《宿命之环》第五部，第一百章《污染源》'})
  entry['matchNote'] = '统计“格伊”的字面出现；摩罗拉行动中的格伊被揭示为镜中人，不将未经核实的原身合并。'
 if entry['id'] == 'georgia_paco':
  entry['alias'] = '鲁维奥的妻子'
  entry['aliasSources'].append({'alias':'鲁维奥的妻子','source':'《宿命之环》第四部，第四十八章《反常的情况》'})
  entry['matchNote'] = '统计“乔吉娅”的字面出现；其中包含被“洛基”操纵为临时秘偶时的称呼，未逐处区分控制前后。'
 if entry['id'] == 'marta_paco':
  entry['alias'] = '玛尔塔夫人 / 帕科家族老祖母'
  entry['aliasSources'].append({'alias':'帕科家族老祖母','source':'《宿命之环》第四部，第四十八章《反常的情况》、第八十四章《秘偶》'})
  entry['matchNote'] = '统计“玛尔塔”的字面出现；包含被“洛基”操纵为秘偶时的称呼，未逐处区分控制前后。'
 if entry['id'] == 'griffith':
  entry['alias'] = '尼基拉'
  entry['aliasSources'].append({'alias':'尼基拉','source':'《宿命之环》第五部，第八十六章《痴迷》、第八十七章《“荒野”》'})
  entry['matchNote'] = '合计“尼基拉”和“格里菲斯”的字面出现；相邻称谓可能重复计数。同一人身份由其本人在受询时确认，并称自己就是原本的尼基拉。'
 if entry['id'] == 'pualis':
  entry['alias'] = '普阿利斯·德·罗克福尔'
  entry['aliasSources'].append({'alias':'普阿利斯·德·罗克福尔','source':'《宿命之环》第六部，第一百三十二章《蘑菇怪物》'})
 if entry['id'] in {'vijaypan','les_morora','kemolo','vanak','robert_south'}:
  entry['matchNote'] = '仅统计《宿命之环》的字面写法；同名或词语重叠仍需逐处消歧。'
 if entry['id'] == 'les_morora':
  entry['matchNote'] = '仅统计《宿命之环》的字面写法，排除“帕列斯”中的同名字串；其他同名或词语重叠仍需逐处消歧。'
 if entry['id'] in {'brown_sauron','pedro_captain'}:
  entry['matchNote'] = '仅统计《宿命之环》的字面写法；同名用法仍需逐处核查。'
 if entry['id'] == 'rato':
  entry['alias'] = '“咸蛋超人”'
  entry['aliasSources'].append({'alias':'“咸蛋超人”','source':'《宿命之环》第四部，第八十六章《窃取》'})
  entry['matchNote'] = '包含“拉托”和“咸蛋超人”的字面匹配；两者连写按一次计数，其他同名或文化引用仍需核查。'
 if entry['id'] == 'maric':
  entry['alias'] = '“宝剑骑士”'
  entry['aliasSources'].append({'alias':'“宝剑骑士”','source':'《宿命之环》第五部，第三十七章《诅咒》'})
  entry['matchNote'] = '包含“马里奇”和“宝剑骑士”的字面匹配；称号与姓名连写只计一次，称号也可能指牌本身，仍需消歧。'
 if entry['id'] == 'clarisse':
  entry['alias'] = '黑之魔女'
  entry['aliasSources'].append({'alias':'黑之魔女','source':'《宿命之环》第三部，第一百九十一章《隐秘的尊名》'})
  entry['matchNote'] = '包含“克拉丽丝”和“黑之魔女”的字面匹配，称号与姓名连写只计一次；其他同名用法仍需核查。'
 if entry['id'] in {'mad_lady','bard_april','agent_007','friend_april'}:
  entry['matchNote'] = '以代号建立候选条目；字面统计可能包括非人物用法，真实身份仍需核查。'
 if entry['id'] in {'professor','associate_professor','condensed_matter','periodic_table','isotope','lady_moon','underworld_taoist'}:
  entry['matchNote'] = '仅统计带中文引号的完整代号；其他标点写法和未加引号的称呼未计入。'
 if entry['id'] == 'gandalf':
  entry['matchNote'] = '按代号“甘道夫”字面统计；普通的同名文化引用仍可能混入。'
 if entry['id'] == 'leodero':
  entry['alias'] = '风天使 / 风暴之主'
  entry['aliasSources'].append({'alias':'风天使 / 风暴之主','source':'《诡秘之主》第六部，第九十六章《遵从心的意愿》'})
  entry['matchNote'] = '包含“列奥德罗”和“风暴之主”的字面匹配；教会名称、祷文和其他间接提及尚未逐处区分。'
 if entry['id'] == 'aucuses':
  entry['alias'] = '纯白天使 / 疑似永恒烈阳'
  entry['aliasSources'].append({'alias':'纯白天使；与永恒烈阳的对应为克莱恩的疑问','source':'《诡秘之主》第五部，第一百七十一章《最强组织》'})
  entry['matchNote'] = '仅统计“奥赛库斯”；“永恒烈阳”身份在所引章节中以疑问呈现，尚未合并称号计数。'
 if entry['id'] == 'herabergen':
  entry['alias'] = '智天使 / 知识与智慧之神'
  entry['aliasSources'].append({'alias':'知识与智慧之神','source':'《诡秘之主》第六部，第一百一十二章《敌人的本质》'})
  entry['matchNote'] = '包含“赫拉伯根”和“知识与智慧之神”的字面匹配；教会名称及其他间接提及尚未逐处区分。'
 if entry['id'] == 'cheek':
  entry['alias'] = '原初魔女'
  entry['aliasSources'].append({'alias':'原初魔女','source':'《诡秘之主》第二部，第二百五十八章《克莱恩的准备》'})
  entry['matchNote'] = '包含“奇克”和“原初魔女”的字面匹配，排除“特莉丝奇克”中的同名字串；其余称号及指代仍需核查。'
 if entry['id'] == 'medici':
  entry['alias'] = '红天使 / 战争天使'
  entry['aliasSources'].append({'alias':'红天使 / 战争天使','source':'《宿命之环》第三部，第一百七十章《隐秘的往事》'})
  entry['matchNote'] = '排除了完整写作“阿不思·梅迪奇”及“梅迪奇家族”的命中；“红天使”等称号尚未计入，合体恶灵的阶段需结合上下文区分。'
 if entry['id'] == 'ouroboros':
  entry['alias'] = '命运天使 / 吞尾者'
  entry['aliasSources'].append({'alias':'命运天使 / 吞尾者','source':'《诡秘之主》第二部，第二百五十三章《吞尾者》'})
  entry['matchNote'] = '仅统计“乌洛琉斯”；“命运天使”和“吞尾者”等称号尚未纳入字面计数。'
 if entry['id'] == 'elaine':
  entry['matchNote'] = '“伊莲”也曾被克莱恩用于伪装；字面次数没有区分本人、假扮者及其他同名用法。'
 if entry['id'] == 'tracy':
  entry['alias'] = '疾病少女 / 疾病中将 / 疾病女王'
  entry['aliasSources'].append({'alias':'疾病少女 / 疾病中将','source':'《诡秘之主》第二部，第七十九章《交流消息》、第八十一章《星之上将》'})
  entry['aliasSources'].append({'alias':'疾病女王','source':'《宿命之环》第四部，第二十一章《怪鱼》'})
  entry['matchNote'] = '仅统计“特雷茜”的字面写法；不同阶段的称号尚未纳入计数。'
 if entry['id'] == 'katarina':
  entry['alias'] = '白之圣女 / 白之魔女'
  entry['aliasSources'].append({'alias':'白之圣女','source':'《诡秘之主》第五部，第八十三章《1号遗迹》'})
  entry['aliasSources'].append({'alias':'白之魔女','source':'《诡秘之主》第五部，第一百五十章《协作》'})
  entry['matchNote'] = '仅统计“卡特琳娜”；称号及其他同名用法尚需消歧。'
 if entry['id'] == 'ludwell':
  entry['alias'] = '地狱上将'
  entry['aliasSources'].append({'alias':'地狱上将','source':'《诡秘之主》第二部，第七十九章《交流消息》'})
  entry['matchNote'] = '仅统计“路德维尔”；“地狱上将”称号尚未纳入计数。'
 if entry['id'] == 'wisdom_eye':
  entry['matchNote'] = '以“智慧之眼”称号建档；字面统计尚未排除其他用法，真实姓名仍需核查。'
 if entry['id'] == 'kavituwa':
  entry['alias'] = '海神（旧信仰）'
  entry['aliasSources'].append({'alias':'海神','source':'《诡秘之主》第三部，第五十四章《本地信仰》'})
  entry['matchNote'] = '仅统计“卡维图瓦”；“海神”在不同阶段可能指向不同存在，未直接合并计数。'
 if entry['id'] in {'walter','richardson','tracy','amilys','gawain','starling','heimm','gusin','gabriel','fidel','bainfel','rubio','rayasa','maislo'}:
  entry['matchNote'] = '按名字字面统计，可能包含同名人物或其他词语，尚需逐处消歧。'
 if entry['id'] == 'rubio':
  entry['matchNote'] = '“鲁维奥”的字面次数混合了本人背景与洛基冒名活动，尚未逐处区分，不能当作本人实际提及总数。'
 if entry['id'] == 'loki':
  entry['alias'] = '曾冒用鲁维奥·帕科的身份'
  entry['aliasSources'].append({'alias':'曾冒用鲁维奥·帕科的身份','source':'《宿命之环》第四部，第八十四章《秘偶》、第八十八章《高效找人法》'})
  entry['matchNote'] = '统计“洛基”的字面出现；冒用鲁维奥身份时使用的称呼尚未完整计入，不能与鲁维奥条目的字面次数直接相加。'
 if entry['id'] == 'abscess_hand':
  entry['alias'] = '断手老兄 / 疑似吉达斯'
  entry['aliasSources'].append({'alias':'疑似吉达斯（卢米安的推测）','source':'《宿命之环》第六部，第八章《那个名字》；第七部，第二十五章《吉达斯》'})
  entry['matchNote'] = '统计“脓肿断手”的字面出现；“吉达斯”是后续推测的身份，未直接合并计数。'
 if entry['id'] == 'thibaut_jacques':
  entry['matchNote'] = '仅统计《宿命之环》中“提伯特”的字面出现；相关章节指向议员助理秘书提伯特·雅克。'
 if entry['id'] == 'angouleme':
  entry['alias'] = '“007”'
  entry['aliasSources'].append({'alias':'“007”','source':'《宿命之环》第五部，第十九章《两股精神》'})
  entry['matchNote'] = '统计“昂古莱姆”和带中文引号的代号“007”；紧邻的代号与名字合计一次，其他写法未纳入。'
  entry['classificationEvidence'].extend([
   {'kind':'organization','value':'永恒烈阳教会','source':'《宿命之环》第七部，第十四章《“007”透露的信息》'},
   {'kind':'organization','value':'卷毛狒狒研究会','source':'《宿命之环》第五部，第十九章《两股精神》'},
   {'kind':'pathway','value':'太阳','source':'《宿命之环》第七部，第十四章《“007”透露的信息》'},
   {'kind':'sequence','value':'无暗者','source':'《宿命之环》第七部，第十四章《“007”透露的信息》'}])
 if entry['id'] == 'amon':
  entry['alias'] = '莫尼特（分身） / 曾冒用忒尔弥波洛斯之名'
  entry['aliasSources'].append({'alias':'莫尼特（被寄生的分身）','source':'《宿命之环》第三部，第九十四章《莫尼特的真实身份》'})
  entry['matchNote'] = '仅统计“阿蒙”的字面出现；莫尼特及曾冒用的忒尔弥波洛斯等称呼尚未纳入计数。'
 if entry['id'] == 'chris_mana':
  entry['alias'] = '“灾难魔女”'
  entry['aliasSources'].append({'alias':'“灾难魔女”','source':'《宿命之环》第六部，第九章《恐怖之事》'})
  entry['matchNote'] = '仅统计《宿命之环》中“克丽丝芒娜”的字面出现，包含幽影、残余意识与相关夜柱的提及。'
  entry['classificationEvidence'].extend([
   {'kind':'pathway','value':'魔女','source':'《宿命之环》第六部，第九章《恐怖之事》'},
   {'kind':'sequence','value':'灾难魔女','source':'《宿命之环》第六部，第九章《恐怖之事》'}])
 if entry['id'] == 'meviti':
  entry['alias'] = '“钢铁”'
  entry['aliasSources'].append({'alias':'“钢铁”','source':'《诡秘之主》第三部，第三十六章《人之将死》'})
  entry['matchNote'] = '统计《诡秘之主》中“麦维提”的字面出现；单独的“钢铁”称号尚未计入。'
  entry['classificationEvidence'].append({'kind':'sequence','value':'活尸','source':'《诡秘之主》第三部，第四十六章《放牧》'})
 if entry['id'] == 'huntley_pirate':
  entry['alias'] = '“血色荆棘”'
  entry['aliasSources'].append({'alias':'“血色荆棘”','source':'《诡秘之主》第三部，第四十三章《冷静的斯考尔》'})
 if entry['id'] == 'skoll_pirate':
  entry['alias'] = '冷静的斯考尔'
  entry['aliasSources'].append({'alias':'冷静的斯考尔','source':'《诡秘之主》第三部，第四十三章《冷静的斯考尔》'})
 for ident, alias, source in [
  ('ait_hammer','“铁锤”','《宿命之环》第二部，第五十六章《再遇简娜》'),
  ('harman_bald','“光头”','《宿命之环》第二部，第五十六章《再遇简娜》'),
  ('olsen_supervisor','“督导”','《宿命之环》第三部，第二十章《理念》'),
  ('castina','“矮脚烛台”','《宿命之环》第二部，第一百一十六章《匕现》'),
  ('steve_wraith','“怨魂”','《诡秘之主》第二部，第一百三十五章《可怕的“怨魂”》'),
  ('enzo_winner','“赢家” / 恩尤尼','《诡秘之主》第四部，第一百七十七章《侍奉好运》；第五部，第二十九章《熟悉的味道》'),
  ('coshnam','“天灾女王” / 精灵王后','《诡秘之主》第六部，第三十五章《重现》'),
  ('yurisian','“北方之王”','《诡秘之主》第三部，第二百一十七章《BOSS战》'),
  ('karaman','“巫王”','《诡秘之主》第六部，第八十三章《两处》'),
  ('osaito','“巫王”','《宿命之环》第五部，第二十五章《第二天》'),
  ('jason_zombie','“活尸”','《诡秘之主》第二部，第一百三十四章《活尸和狼人》'),
  ('tyr_werewolf','“狼人”','《诡秘之主》第二部，第一百三十四章《活尸和狼人》')]:
  if entry['id'] == ident:
   entry['alias'] = alias
   entry['aliasSources'].append({'alias':alias,'source':source})
   entry['matchNote'] = '按所列名字字面统计；同名或非人物用法仍需逐处消歧。'
 if entry['id'] == 'enzo_winner':
  entry['matchNote'] = '合计“恩佐”和改名后的“恩尤尼”的字面出现；包含成为秘偶后的称呼，其他同名用法仍需消歧。'
 if entry['id'] == 'jason_zombie':
  entry['matchNote'] = '只统计第二部第一百三十三至一百三十七章中“杰森”的字面出现；与涉及欲望使徒事件的同名身份分开，不代表全书总数。'
 if entry['id'] in {'pasha_beldan','roy_beldan','byers_beldan','phil_beldan'}:
  entry['matchNote'] = '仅统计《诡秘之主》第七卷第十五至第二十四章中该名字的字面出现；与同名人物分开，不代表全书总数。'
 if entry['id'] == 'anna_tingen':
  entry['matchNote'] = '仅统计《诡秘之主》第一部已核对章节中的“安娜”；不合计奥利安娜、阿里安娜或其他同名人物。'
 if entry['id'] == 'harry_owl':
  entry['alias'] = '猫头鹰哈里'
  entry['aliasSources'].append({'alias':'猫头鹰哈里','source':'《诡秘之主》第三部，第一百二十三章《“判定”》'})
  entry['matchNote'] = '仅统计《诡秘之主》第三部第一百零三至一百三十章中的“哈里”和“猫头鹰”；相邻称呼合计一次，不代表全书总数。'
 if entry['id'] == 'richard_fate':
  entry['alias'] = '“命运议员”'
  entry['aliasSources'].append({'alias':'“命运议员”','source':'《诡秘之主》第三部，第一百二十九章《命运议员》'})
  entry['matchNote'] = '仅统计《诡秘之主》中“瑞乔德”的字面出现；单独的“命运议员”未计入。'
 if entry['id'] == 'byers':
  entry['name'] = '拜尔斯（乌托邦）'
  entry['short'] = '拜尔斯（乌托邦）'
  entry['matchNote'] = '仅统计第七卷第七十、七十一、七十四、七十七及七十八章中该名字的字面出现；与贝尔丹的同名人物分开，不代表全书总数。'
 if entry['id'] in {'bogda_jones','wos_kent','tyr_werewolf'}:
  entry['matchNote'] = '仅统计《诡秘之主》中的所列名字；其他同名或词语重叠仍需核查。'
 for ident, pathway, sequence, source in [
  ('jason_zombie','囚犯','活尸','《诡秘之主》第二部，第一百三十四章《活尸和狼人》'),
  ('tyr_werewolf','囚犯','狼人','《诡秘之主》第二部，第一百三十四章《活尸和狼人》'),
  ('steve_wraith','囚犯','怨魂','《诡秘之主》第二部，第一百三十五章《可怕的“怨魂”》'),
  ('enzo_winner','怪物','赢家','《诡秘之主》第四部，第一百七十七章《侍奉好运》')]:
  if entry['id'] == ident:
   entry['classificationEvidence'].extend([
    {'kind':'pathway','value':pathway,'source':source},
    {'kind':'sequence','value':sequence,'source':source}])
 # Tarot aliases are quoted as titles in the novel, including in the alias panel.
 tarot_aliases = {'audrey':'正义','alger':'倒吊人','fors':'魔术师',
                  'derrick':'太阳','emlyn':'月亮','cattleya':'隐者',
                  'leonard':'星星','xio':'审判'}
 if entry['id'] in tarot_aliases:
  title = tarot_aliases[entry['id']]
  entry['alias'] = entry['alias'].replace(title, '“' + title + '”')
  for evidence in entry['aliasSources']:
   if evidence['alias'] == title:
    evidence['alias'] = '“' + title + '”'
 if entry['id'] == 'fors':
  entry['alias'] += ' / “没有梦想的咸鱼”（梦境笔名）'
  entry['aliasSources'].append({'alias':'“没有梦想的咸鱼”（梦境笔名）','source':'《宿命之环》第六部，第四十五章《电影》'})
  entry['matchNote'] = '统计“佛尔思”和梦境笔名“没有梦想的咸鱼”的字面出现；“魔术师”兼指序列与其他人物，尚未计入，梦境形象需与现实经历区分。'
 # 小说中这些海盗称号和代号常以双引号呈现。
 quoted_titles = {'black_scorpion':['黑蝎'], 'cattleya':['星之上将','星之女王'], 'bernadette':['神秘女王'],
                  'clarisse':['黑之魔女'], 'edwina':['冰山中将'],
                  'senor':['血之上将'], 'qilangos':['飓风中将']}
 for title in quoted_titles.get(entry['id'], []):
  entry['alias'] = entry['alias'].replace(title, '“' + title + '”')
  for evidence in entry['aliasSources']:
   if evidence['alias'] == title:
    evidence['alias'] = '“' + title + '”'
 # Preserve the quotation marks used for these aliases in the original text.
 if entry['id'] == 'hisoka':
  entry['short'] = '“西索”'
 if entry['id'] in {'loki','mad_lady','bard_april','agent_007','friend_april',
                    'gandalf','professor','associate_professor','condensed_matter',
                    'periodic_table','isotope','lady_moon','underworld_taoist','hela',
                    'mister_k','mr_a','mr_z','abscess_hand','jason'}:
  entry['name'] = '“' + entry['name'] + '”'
  entry['short'] = '“' + entry['short'] + '”'
# Copy the reviewed prose only when the document heading uniquely matches a
# graph name. Short names and guessed aliases can refer to different people.
profiles = {}
for document_path in sorted((root/'source/characters/entries').glob('*.md')):
 document = document_path.read_text(encoding='utf-8')
 match = re.match(r'\A---\n(.*?)\n---\n(.*)', document, re.S)
 if not match:
  raise ValueError(f'人物词条缺少 front matter: {document_path}')
 frontmatter, body = match.groups()
 heading_match = re.search(r'^document_name: (.+)$', frontmatter, re.M)
 if not heading_match:
  raise ValueError(f'人物词条缺少 document_name: {document_path}')
 heading = json.loads(heading_match.group(1))
 for name in re.split(r'\s+/\s+', heading.strip()):
  profiles.setdefault(name, []).append((body, document_path, frontmatter))
for entry in out:
 # Nationality and organization grouping comes only from character documents.
 # The older curated clues remain in this script for review, not as a fallback.
 entry['classificationEvidence'] = [fact for fact in entry.get('classificationEvidence', []) if fact.get('kind') not in {'organization', 'nationality'}]
 # These IDs are manually matched to longer names in the reviewed document.
 document_names = {'ava': '阿娃·利齐耶'}
 matches = profiles.get(document_names.get(entry['id'], entry['name']), [])
 if len(matches) == 1:
  body, document_path, frontmatter = matches[0]
  fields = re.findall(r'^- ((?:国籍(?:／身份)?|所属组织|(?:其他|后续)组织经历|姓名)：[^\n]+)', body, re.M)
  if fields:
   entry['documentProfile'] = fields
  entry['documentProfileUrl'] = '../characters/entries/' + quote(document_path.stem, safe='') + '/'
  # Empty or missing categories mean that grouping has not been verified.
  structured = re.search(r'^graph_classifications: (.+)$', frontmatter, re.M)
  if structured:
   classifications = json.loads(structured.group(1))
   if not isinstance(classifications, dict) or set(classifications) - {'organization', 'nationality'}:
    raise ValueError(f'人物分类格式错误: {document_path}')
   for kind, facts in classifications.items():
    if not isinstance(facts, list):
     raise ValueError(f'人物分类须为数组: {document_path}: {kind}')
    for fact in facts:
     if not isinstance(fact, dict) or not fact.get('value') or not fact.get('source'):
      raise ValueError(f'人物分类缺少名称或出处: {document_path}: {kind}')
     entry['classificationEvidence'].append({'kind': kind, **fact})

name_ids = {}
for entry in out:
 name_ids.setdefault(entry['name'], []).append(entry['id'])
for name, ids in name_ids.items():
 if len(ids) > 1:
  print(f'同名条目待核对：{name} ({", ".join(ids)})')
short_ids = {}
for entry in out:
 if len(entry['short']) > 1:
  short_ids.setdefault(entry['short'], []).append(entry['id'])
for short, ids in short_ids.items():
 if len(ids) > 1:
  print(f'简称相同待核对（可能是不同人物）：{short} ({", ".join(ids)})')
output=root/'source/relationships/character-index.js'
output.write_text('// 由 tools/build-character-index.py 生成；提及数是字面匹配，并非消歧后的完整人数。\nconst indexedCharacters = '+json.dumps(out,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'已生成 {len(out)} 位候选人物')
