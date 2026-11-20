#!/usr/bin/env python3
"""Build a conservative character index from one copy of each novel."""
import json,re
from urllib.parse import quote
from character_directory import FIRST_BOOK_NAMES, SCOTT_NAME_PATTERN, SEQUEL_NAME_PATTERNS, build_directory
from corpus_review import BOOKS, iter_chapters, read_reference_text, reference_texts
from pathlib import Path
root=Path(__file__).resolve().parents[1]
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
candidates.extend([('kornley', '科恩黎·怀特', '科恩黎', '', '值夜者'), ('luoyao', '洛耀·莱汀', '洛耀', '', '值夜者'), ('seeka', '西迦·特昂', '西迦', '', '值夜者'), ('riel', '瑞尔·比伯', '瑞尔·比伯', '', '其他人物'), ('alfred', '阿尔弗雷德·霍尔', '阿尔弗雷德', '', '其他人物'), ('hibbert', '希伯特·霍尔', '希伯特', '', '其他人物'), ('welch', '韦尔奇·麦格文', '韦尔奇', '', '其他人物'), ('laurence', '劳伦斯·诺德', '劳伦斯', '', '其他人物'), ('naya', '娜娅', '娜娅', '', '其他人物'), ('dust', '达斯特·古德里安', '达斯特', '', '其他人物')])
candidates.extend([('albus', '阿不思·梅迪奇', '阿不思', '', '宿命之环'), ('poufer', '普伊弗·索伦', '普伊弗', '', '宿命之环'), ('vermonda', '佛蒙达·香槟·索伦', '佛蒙达', '', '宿命之环')])
candidates.extend([('mike', '迈克·约瑟夫', '迈克·约瑟夫', '', '其他人物'), ('jurgen', '于尔根·库珀', '于尔根', '', '其他人物'), ('joyce', '乔伊斯·迈尔', '乔伊斯', '', '其他人物'), ('waite', '韦特·希尔蒙', '韦特·希尔蒙', '', '其他人物'), ('archbishop_anthony', '安东尼·史蒂文森', '安东尼·史蒂文森', '', '其他人物'), ('sirius', '西里斯·阿瑞匹斯', '西里斯', '', '其他人物'), ('raft', '拉夫特·庞德', '拉夫特·庞德', '', '其他人物'), ('framy', '弗兰米·凯奇', '弗兰米·凯奇', '', '其他人物'), ('maipu', '迈普·迈尔', '迈普·迈尔', '', '宿命之环'), ('sibyl', '西比尔·贝里', '西比尔·贝里', '', '宿命之环')])
candidates.extend([('earl_hall', '霍尔伯爵', '霍尔伯爵', '', '其他人物'), ('allen', '艾伦·克瑞斯', '艾伦·克瑞斯', '', '其他人物'), ('mobet', '莫贝特·索罗亚斯德', '莫贝特', '', '其他人物'), ('pacheco', '帕切科·道恩', '帕切科', '', '其他人物'), ('repard', '雷帕德', '雷帕德', '', '其他人物'), ('maynard', '梅纳德', '梅纳德', '', '其他人物'), ('shatas', '夏塔丝', '夏塔丝', '', '其他人物'), ('snowman', '斯诺曼', '斯诺曼', '', '其他人物'), ('longzel', '龙泽尔', '龙泽尔', '', '其他人物'), ('gilchies', '吉尔希艾斯', '吉尔希艾斯', '', '其他人物'), ('daisy', '黛西', '黛西', '', '其他人物'), ('sherman', '谢尔曼', '谢尔曼', '', '其他人物')])
candidates.extend([('beost', '贝奥斯特', '贝奥斯特', '', '宿命之环'), ('madena', '马戴娜·贝内', '马戴娜', '', '宿命之环'), ('roche', '洛希·露易丝·桑松', '洛希·露易丝·桑松', '', '宿命之环'), ('julie', '朱莉', '朱莉', '', '宿命之环'), ('philippe', '菲利普', '菲利普', '', '宿命之环'), ('salistes', '莎莉丝特', '莎莉丝特', '', '宿命之环'), ('montserrat', '蒙塞拉特', '蒙塞拉特', '', '宿命之环'), ('guy', '格伊', '格伊', '', '宿命之环')])
candidates.extend([('hela', '海拉', '海拉', '', '宿命之环'), ('mister_k', 'K先生', 'K先生', '', '宿命之环'), ('black_scorpion', '罗杰', '黑蝎', '', '宿命之环'), ('riya', '瑞雅', '瑞雅', '', '宿命之环'), ('harrison', '哈里森', '哈里森', '', '宿命之环'), ('sasrir', '萨斯利尔', '萨斯利尔', '', '其他人物'), ('lilith', '莉莉丝', '莉莉丝', '', '其他人物'), ('badheir', '巴德海尔', '巴德海尔', '', '其他人物'), ('salinger', '萨林格尔', '萨林格尔', '', '其他人物')])
candidates.extend([('tracy_inn', '翠西', '翠西', '', '其他人物'), ('kelly_butler', '刻利', '刻利', '', '其他人物'), ('nast', '纳斯特', '纳斯特', '', '其他人物'), ('ademis', '阿德米索尔', '阿德米索尔', '', '其他人物'), ('ormir', '奥尔米尔', '奥尔米尔', '', '其他人物'), ('irene', '艾琳', '艾琳', '', '其他人物'), ('rosago', '罗萨戈', '罗萨戈', '', '其他人物'), ('bonova', '博诺瓦·古斯塔夫', '博诺瓦', '', '其他人物'), ('cheek', '奇克', '奇克', '', '其他人物'), ('joshua', '约书亚', '约书亚', '', '其他人物'), ('elland', '艾尔兰', '艾尔兰', '', '其他人物'), ('leomaster', '利奥马斯特', '利奥马斯特', '', '其他人物'), ('erhog', '艾瑞霍格', '艾瑞霍格', '', '其他人物'), ('laurent', '洛朗特', '洛朗特', '', '宿命之环'), ('herdsey', '赫德西', '赫德西', '', '宿命之环'), ('flameng', '弗拉芒', '弗拉芒', '', '宿命之环'), ('francesco', '弗朗切斯科', '弗朗切斯科', '', '宿命之环'), ('primpin', '普林皮诺', '普林皮诺', '', '宿命之环'), ('devaho', '德瓦霍·安德雷拉德', '德瓦霍', '', '宿命之环'), ('sallent', '萨连特·恩派亚', '萨连特', '', '宿命之环'), ('worms', '沃尔姆斯', '沃尔姆斯', '', '宿命之环'), ('grisha', '格里沙', '格里沙', '', '宿命之环')])
candidates.extend([('groselle','格罗塞尔','格罗塞尔','','其他人物'),('hermes','赫密斯','赫密斯','','其他人物')])
candidates.extend([('soest', '索斯特', '索斯特', '', '值夜者'), ('franky', '弗兰奇', '弗兰奇', '', '其他人物'), ('eslant', '伊思兰特·奥西斯莱卡', '伊思兰特', '', '其他人物'), ('lolotta', '洛络塔', '洛络塔', '', '值夜者'), ('cynthia', '辛西娅', '辛西娅', '', '其他人物'), ('vickrol', '维克罗尔', '维克罗尔', '', '其他人物'), ('clarisse', '克拉丽丝', '克拉丽丝', '', '宿命之环'), ('valerio', '瓦莱里奥', '瓦莱里奥', '', '宿命之环'), ('goodwill', '博诺·古德维尔', '古德维尔', '', '宿命之环')])
candidates.append(('bethel_abraham','伯特利·亚伯拉罕','伯特利','','其他人物'))
candidates.append(('bulman','布尔曼','布尔曼','魔鬼巫师','宿命之环'))
candidates.append(('helen_bulman','海伦','海伦','','宿命之环'))
candidates.extend([
 ('miller_carter','米勒·卡特','米勒·卡特','','其他人物'),
 ('bishop_miller','米勒主教','米勒主教','','其他人物'),
 ('auston_levitt','奥斯顿·利维特','奥斯顿','','其他人物'),
 ('max_livermore','麦克斯·利维摩尔','麦克斯','','其他人物'),
])
candidates.append(('bulatov_ivan','布拉托夫·伊万','布拉托夫','','其他人物'))
candidates.append(('isance','伊桑丝','伊桑丝','','宿命之环'))
candidates.append(('jorg_neuins','约尔格','约尔格','','宿命之环'))
candidates.append(('simon_giaro','西蒙·吉亚罗','西蒙·吉亚罗','','宿命之环'))
candidates.append(('nathan_lop','内森·洛普','内森·洛普','','宿命之环'))
candidates.append(('portland_momont','波特兰·莫蒙特','波特兰','','其他人物'))
candidates.append(('paval_nisen','帕瓦尔·尼森','帕瓦尔','','宿命之环'))
candidates.append(('horamick','霍拉米克·海顿','霍拉米克','','其他人物'))
candidates.extend([('morane','莫兰·阿维尼','莫兰','','宿命之环'),('connors','康纳斯·维克托','康纳斯','','其他人物'),('kaspars','卡斯帕斯·坎立宁','卡斯帕斯','','其他人物'),('hal_constantine','哈尔·康斯坦丁','哈尔','','其他人物')])
candidates.extend([('orpheus_ship','奥尔弗斯','奥尔弗斯','','其他人物'),('bruce_walls','布鲁·沃尔斯','布鲁','','其他人物'),('class_kitz','克拉斯·基兹','克拉斯','','宿命之环'),('snalna','斯纳尔纳·艾因霍恩','斯纳尔纳','','宿命之环'),('travis','特拉维斯·埃弗瑞特','特拉维斯','','宿命之环')])
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
tarot_aliases = {'audrey':'正义','alger':'倒吊人','fors':'魔术师',
                  'derrick':'太阳','emlyn':'月亮','cattleya':'隐者',
                  'leonard':'星星','xio':'审判'}
book_parts = {}
for name, path, encoding in reference_texts():
 body = read_reference_text(path, encoding)
 if name == '诡秘之主':
  body = body.partition('（一个普通人的日常完）')[0]
 book_parts.setdefault(name, []).append(body)
texts = [(name, '\n'.join(parts)) for name, parts in book_parts.items()]

def sequel_chapters():
 for name, path, encoding in reference_texts():
  if name == '宿命之环':
   yield from iter_chapters(path, encoding)
# 第六部逐章消歧。目曙医院事件中，从“萨满”空间返回公寓仍在梦境都市内。
rozanne_real = rozanne_dream = 0
for volume, heading, body in sequel_chapters():
 if not volume.startswith('第六部'):
  continue
 if heading.startswith('第一百五十章'):
  story = body.split('第六部总结兼请假', 1)[0]
  dream = story.count('梦中的罗珊')
  real = story.count('罗珊') - dream  # 简娜等人在现实中寻找并见到罗珊母女。
 else:
  real = len(re.findall(r'现实中的罗珊|现实里的罗珊|资料里对罗珊背景的介绍', body))
  dream = body.count('罗珊') - real
 rozanne_real += real
 rozanne_dream += dream
# The dukedom passes to Pallas's eldest son. Later chapters still discuss
# the assassination, sometimes in the same scene as the current duke.
negan_mentions = {'father': 0, 'son': 0}
for volume, chapter, body in iter_chapters(*BOOKS[0][1:]):
 part = volume.split()[0]
 heading = chapter.split()[0]
 if part in {'第一部','第二部','第三部'}:
  negan_mentions['father'] += len(re.findall(r'帕拉斯·尼根(?:公爵)?|尼根公爵', body))
  continue
 negan_mentions['father'] += body.count('帕拉斯·尼根')
 for line in body.splitlines():
  if '尼根公爵' not in line:
   continue
  if re.search(r'现任的?尼根公爵|尼根公爵派来的人', line):
   negan_mentions['son'] += line.count('尼根公爵')
  elif (part, heading) in {('第四部','第六章'),('第四部','第八十三章'),('第五部','第十六章'),('第五部','第四十四章')} or '上位尼根公爵' in line:
   negan_mentions['father'] += line.count('尼根公爵')

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
 if ident in {'louis_lund','hugues_correct'}:
  terms.append(name.replace('·','.'))
 if ident == 'nathan_lop':
  terms.append('洛普先生')
 if ident == 'will':
  terms.extend(['威尔·昂塞汀','威尔.昂赛汀'])
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
 if ident == 'xu_xinyang':
  terms.append('徐队长')
 if ident == 'fors':
  terms.append('没有梦想的咸鱼')
 if ident == 'lady_moon':
  terms.append('月夫人')
 if ident == 'rato':
  terms.append('咸蛋超人')
 if ident == 'hisoka':
  terms.append('特瓦纳科')
 if ident == 'hilbert':
  terms = ['希尔伯特·阿鲁卡尔德', '希尔伯特', '阿鲁卡尔德']
 if ident == 'stephen_h':
  terms = ['斯蒂芬·汉普雷斯', '斯蒂芬', '汉普雷斯']
 if ident == 'kaspars':
  terms = ['卡斯帕斯·坎立宁','卡斯帕斯','坎立宁']
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
 if ident == 'great_mother':
  terms.append('堕落母神')
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
 elif ident in {'meviti','huntley_pirate'}:
  title = '钢铁' if ident == 'meviti' else '血色荆棘'
  terms.append('“'+title+'”')
  pattern = re.compile(r'(?:“'+title+'”|‘'+title+'’)(?:'+short+')?|'+short)
 elif ident == 'xio':
  terms = ['休·迪尔查', '休小姐', '休女士', '“审判”休', '“审判”小姐', '“审判”女士']
  pattern = re.compile(r'(?:“审判”|‘审判’)(?:休(?:[·.]迪尔查)?|小姐|女士)|休(?:[·.]迪尔查|小姐|女士)')
 elif ident == 'danitz':
  terms.append('“烈焰”')
  pattern = re.compile(r'(?:“烈焰”|‘烈焰’)(?:达尼兹)?|达尼兹')
 elif ident == 'yann':
  terms.append('考特曼')
  pattern = re.compile(r'(?:亚恩[·.])?考特曼')
 elif ident == 'renthas':
  terms.extend(['假埃夫', '假的埃夫'])
  pattern = re.compile(r'假的?埃夫(?:先生)?(?:伦塔司)?|伦塔司')
 elif ident in {'bulatov_ivan','ludwell','tracy'}:
  titles = {'bulatov_ivan':['黄昏中将','黄昏之王'], 'ludwell':['地狱上将'], 'tracy':['疾病少女','疾病中将','疾病女王']}[ident]
  terms.extend(titles)
  title = '(?:' + '|'.join(titles) + ')'
  pattern = re.compile(r'(?:[“‘]?' + title + r'[”’]?\s*)?' + short + '|' + title)
 elif ident in {'butis','kisma'}:
  title = '秘之圣者' if ident == 'butis' else '幽暗圣者'
  terms.append(title)
  pattern = re.compile(r'(?:[“‘]?' + title + r'[”’]?\s*)?' + short + '|' + title)
 elif ident == 'hal_constantine':
  full_name = r'哈尔[·.]?康斯坦丁'
  title = r'[“‘]?深海[中上]将[”’]?'
  pattern = re.compile(title + r'[，、 ]*' + full_name + '|' + full_name + r'的?' + title + '|' + full_name + '|' + title)
 elif ident == 'franca':
  # 连写的称号与名字只计一次；未加引号的红色靴子不计作人物。
  pattern=re.compile(r'(?:(?:“红靴子”|“袖剑”)\s*)?芙兰卡|“红靴子”|“袖剑”|查内姆|罗芙')
 elif ident == 'jenna':
  # 舞台绰号和姓名连写算一次；“浮夸女”亦可泛指其他表演者。
  pattern=re.compile(r'(?:“小婊子”\s*)?简娜|切莉娅|“小婊子”')
 elif ident == 'rato':
  # 连写的“咸蛋超人”拉托是一次提及，不重复计入。
  pattern=re.compile(r'(?:“咸蛋超人”\s*)?(?<![埃布])拉托|咸蛋超人')
 elif ident == 'hisoka':
  pattern=re.compile(r'(?:“西索”[，,、\s]*)?特瓦纳科|西索')
 elif ident == 'cattleya':
  pattern=re.compile(r'(?:[“]?(?:星之上将|星之女王)[”]?[，,、\s]*)?嘉德丽雅|星之上将|星之女王')
 elif ident == 'bernadette':
  pattern=re.compile(r'(?:[“]?神秘女王[”]?[，,、\s]*)?贝尔纳黛|神秘女王|黄贝贝')
 elif ident == 'ouroboros':
  terms.append('乌珞琉斯')
  pattern=re.compile(r'乌[洛珞]琉斯')
 elif ident == 'katarina':
  terms.extend(['白之圣女','白之魔女'])
  pattern=re.compile(r'(?:[“‘]?(?:白之圣女|白之魔女)[”’]?\s*)?卡特琳娜(?:[·.]佩莱)?|白之圣女|白之魔女')
 elif ident == 'clarisse':
  pattern=re.compile(r'(?:[“]?黑之魔女[”]?[，,、\s]*)?克拉丽丝|黑之魔女')
 elif ident == 'maric':
  pattern=re.compile(r'(?:[“]?宝剑骑士[”]?[，,、\s]*)?马里奇|宝剑骑士')
 elif ident == 'ruhr':
  pattern=re.compile(r'(?<!特)(?<!欧)鲁尔')
 elif ident == 'hilaire':
  terms = ['希拉里昂','希拉里恩','橘光']
  pattern = re.compile(r'(?:[“‘]橘光[”’]|橘光)(?:希拉里[昂恩])?|希拉里[昂恩]')
 elif ident == 'kali':
  terms = ['卡利神甫','卡利']
  pattern = re.compile(r'(?<!芙兰)卡利(?:神甫)?(?!斯)')
 elif ident in {'ait_hammer','harman_bald','castina'}:
  title = {'ait_hammer':'铁锤','harman_bald':'光头','castina':'矮脚烛台'}[ident]
  terms.append('“'+title+'”')
  pattern = re.compile(r'(?:“'+title+'”|‘'+title+'’)(?:'+short+')?|'+short)
 elif ident == 'ryan':
  pattern=re.compile(r'(?<!克)莱恩')
 elif ident == 'stephen_h':
  # Exclude 斯蒂芬斯街 and 凯蒂·斯蒂芬娜·比伯.
  pattern = re.compile(r'斯蒂芬(?:[·.]汉普雷斯|(?!斯|娜))|汉普雷斯')
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
  pattern=re.compile(r'(?<!格)(?<!镜中)(?<!镜中的)罗塞尔|黄涛')
 elif ident == 'canos':
  pattern=re.compile(r'(?<!托斯)卡诺')
 elif ident == 'les_morora':
  pattern=re.compile(r'(?<!帕)列斯')
 elif ident == 'guillaume':
  pattern=re.compile(r'(?<!小)(?<!贝里家的)(?<!鞋匠)(?<!皮埃尔·)(?<!皮埃尔\.)纪尧姆(?![·.](?:利齐耶|皮埃尔|贝里)|叔叔)')
 elif ident == 'soest':
  pattern=re.compile(r'(?<!特伦)索斯特')
 elif ident == 'goodwill':
  pattern=re.compile(r'古德维尔(?!化工厂)')
 elif ident == 'groselle':
  pattern=re.compile(r'格罗塞尔(?!游记)')
 elif ident == 'hermes':
  terms.extend(['“暴怒”先生', '“暴怒”的兔子'])
  pattern=re.compile(r'(?<!古)赫密斯(?!语|文|或古赫密斯语)|[“‘]暴怒[”’](?:先生|的兔子)')
 elif ident == 'delllau':
  terms.extend(['“黑座之王”','巴洛斯·霍普金斯','埃里克·德雷克','埃里克·德里克'])
  pattern=re.compile(r'德尔劳|(?:[“‘]黑座之王[”’])(?:巴洛斯[·.]霍普金斯)?|巴洛斯[·.]霍普金斯|埃里克[·.]德[雷里]克')
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
 elif ident in {'professor','associate_professor','condensed_matter','periodic_table','isotope','underworld_taoist'}:
  pattern=re.compile(r'(?<=“)' + re.escape(short) + r'(?=”)')
 if ident in tarot_aliases and ident != 'xio':
  title = tarot_aliases[ident]
  honorifics = ('小姐','女士') if ident in {'audrey','fors','cattleya'} else ('先生',)
  # 把称号与相邻名字作为一次提及。单独牌名、序列名和神名不匹配。
  personal_title = '(?:“'+title+'”|‘'+title+'’)(?:'+'|'.join((short,*honorifics))+')'
  pattern = re.compile(personal_title+'|'+pattern.pattern)
  terms.extend('“'+title+'”'+suffix for suffix in honorifics)
 if ident == 'audrey':
  pattern = re.compile(r'[“‘]傲慢[”’]小姐(?:奥黛丽)?|' + pattern.pattern)
  terms.append('“傲慢”小姐')
 if ident == 'lumian':
  pattern = re.compile(r'(?:“战车”|‘战车’)(?:卢米安|先生)|'+pattern.pattern)
  terms.append('“战车”先生')
 term=' / '.join(terms)
 if ident == 'hal_constantine':
  term = '哈尔·康斯坦丁 / “深海中将” / “深海上将”'
 counts={book:sum(1 for _ in pattern.finditer(text)) for book,text in texts}
 if ident == 'amon':
  # 《诡秘之主》第六部阿蒙带走克莱恩期间的独立称号；与同段姓名连写不重复计数。
  reviewed_titles = {'第一章': 2, '第二章': 3, '第三章': 1, '第四章': 1,
                     '第七章': 1, '第十章': 1, '第十一章': 1, '第十五章': 1}
  seen = set()
  for volume, chapter, body in iter_chapters(*BOOKS[0][1:]):
   key = chapter.split()[0]
   if volume.startswith('第六部') and key in reviewed_titles:
    title_count = sum(line.count('时天使') for line in body.splitlines() if '阿蒙' not in line)
    if title_count != reviewed_titles[key]:
     raise ValueError('阿蒙称号章节发生变化：' + volume + ' ' + chapter)
    counts['诡秘之主'] += title_count
    seen.add(key)
  if seen != set(reviewed_titles):
   raise ValueError('缺少阿蒙已核对的称号章节')
  term = '阿蒙 / 已核对的“时天使”称号'
 if ident == 'pallez':
  # 愚者教会的“时天使”与阿蒙的古老称号同形，限定到已核对的章节。
  reviewed_titles = {
   ('第三部', '第一百一十八章'): 9, ('第三部', '第一百二十二章'): 2,
   ('第四部', '第九十七章'): 1, ('第六部', '第四十一章'): 1,
   ('第八部', '第二十五章'): 2, ('第八部', '第二十七章'): 1,
  }
  seen = set()
  for volume, chapter, body in sequel_chapters():
   key = (volume.split()[0], chapter.split()[0])
   if key in reviewed_titles:
    matches = list(re.finditer(r'时之?天使', body))
    if len(matches) != reviewed_titles[key] or any(re.match(r'[”’\'\"]?帕列斯', body[m.end():]) for m in matches):
     raise ValueError('帕列斯称号章节发生变化：' + volume + ' ' + chapter)
    counts['宿命之环'] += len(matches)
    seen.add(key)
  if seen != set(reviewed_titles):
   raise ValueError('缺少帕列斯已核对的称号章节')
  term = '帕列斯 / 已核对的愚者教会“时天使”称号'
 if ident == 'ouroboros':
  # 姓名与紧邻称号只计一次；书中个别解释性连述再按具体语境去重。
  mentions = re.compile(r"(?:[“‘']?(?:命运天使|吞尾者)[”’']?[，,、\s]*)*乌[洛珞]琉斯|命运天使|吞尾者")
  corrections = {
   ('第三部', '第一百三十五章'): (r'命运天使.{0,8}乌洛琉斯，祂的称号是.{0,3}吞尾者', 1),
   ('第三部', '第一百六十七章'): (r'命运天使.{0,30}吞尾者.{0,5}乌洛琉斯', 1),
   ('第三部', '第一百七十章'): (r'吞尾者.{0,5}乌洛琉斯？那个.{0,3}命运天使', 1),
   ('第三部', '第一百八十四章'): (r'乌洛琉斯？这不是.{0,3}命运天使', 1),
   ('第四部', '第一百九十七章'): (r'乌洛琉斯.{0,15}吞尾者.{0,15}命运天使', 2),
  }
  counts = {'诡秘之主': 0, '宿命之环': 0}
  found_corrections = set()
  for book, path, encoding in reference_texts():
   for volume, chapter, body in iter_chapters(path, encoding):
    for match in mentions.finditer(body):
     # 续作中的“命运天使”威尔，以及讨论物品名称的“吞尾者”。
     if match.group() == '命运天使' and re.match(r'[”’\'\"]?威尔', body[match.end():]):
      continue
     if book == '宿命之环' and volume.startswith('第八部') and chapter.startswith('第三十章') and match.group() == '吞尾者':
      continue
     counts[book] += 1
    key = (volume.split()[0], chapter.split()[0])
    if book == '诡秘之主' and key in corrections:
     fragment, duplicates = corrections[key]
     if len(re.findall(fragment, body, re.S)) != 1:
      raise ValueError('乌洛琉斯称谓去重依据发生变化：' + volume + ' ' + chapter)
     counts[book] -= duplicates
     found_corrections.add(key)
  if found_corrections != set(corrections):
   raise ValueError('缺少乌洛琉斯称谓去重章节')
  term = '乌洛琉斯 / 乌珞琉斯 / “命运天使” / “吞尾者”'
 if ident == 'klein':
  beldan_chapters = {'第十七章','第十八章','第十九章','第二十章','第二十一章','第二十二章','第二十四章'}
  counts['诡秘之主'] += sum(body.count('“魔法师”') for volume, chapter, body in iter_chapters(*BOOKS[0][1:])
                        if volume.startswith('第七卷') and chapter.split()[0] in beldan_chapters)
  term += ' / “魔法师”（贝尔丹）'
 if ident == 'harrison':
  counts['宿命之环'] += sum(body.count('哈里斯') for volume, chapter, body in sequel_chapters() if volume.startswith('第五部') and chapter.startswith('第一百二十六章'))
  term = '哈里森 / 哈里斯（地下墓穴交战处异写）'
 if ident == 'richard_fate':
  scenes = {'第一百零八章','第一百二十九章','第一百三十章','第二百零七章'}
  titles = re.compile('“议员先生，|其中一位命运议员|这位“命运议员”|这位命运议员|这是位命运议员')
  counts['诡秘之主'] += sum(len(titles.findall(body)) for volume, chapter, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第三部') and chapter.split()[0] in scenes)
  term = '瑞乔德 / “命运议员” / 议员先生'
 if ident in {'bruce_walls','orpheus_ship'}:
  nickname = '美食家' if ident == 'bruce_walls' else '歌唱家'
  ship_mentions = re.compile('[“‘]' + nickname + '[”’](?:' + name + ')?|' + name)
  counts = {'诡秘之主':sum(len(ship_mentions.findall(body)) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第三部')), '宿命之环':0}
  term = name + ' / “' + nickname + '”'
 if ident == 'jodson':
  title = re.compile(r'[“‘]花领结[”’](?!约德森)')
  counts['诡秘之主'] += len(title.findall(dict(texts)['诡秘之主']))
  term = '约德森 / “花领结”'
 if ident == 'darkwill':
  # 相邻的称呼与姓名（含三种原文连写形式）作为同一次指代。
  extra_title = re.compile(r'(?<!达克威尔的)胖药师(?!达克威尔|的名字是达克威尔)')
  counts['诡秘之主'] += sum(len(extra_title.findall(body)) for volume, chapter, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第三部') or (volume.startswith('第四部') and chapter.startswith('第八十五章')))
  term = '达克威尔 / 胖药师'
 if ident == 'lanervus':
  for volume, heading, body in iter_chapters(*BOOKS[0][1:]):
   chapter = heading.split()[0]
   if volume.startswith('第一部') and chapter in {'第一百七十四章','第一百七十五章'}:
    counts['诡秘之主'] += body.count('埃尔')
   if volume.startswith('第二部') and chapter == '第七十五章':
    counts['诡秘之主'] += body.count('凯文')
  term = '兰尔乌斯 / 埃尔 / 凯文'
 if ident == 'roselle':
  # 续作中黄涛只在第六部第二十一章明确用来谈及大帝本名。
  counts['宿命之环'] -= dict(texts)['宿命之环'].count('黄涛')
  counts['宿命之环'] += sum(body.count('黄涛') for volume, heading, body in sequel_chapters() if volume.startswith('第六部') and heading.startswith('第二十一章'))
 if ident == 'rozanne':
  counts['宿命之环'] = rozanne_real
 if ident == 'eve':
  # 初次见房东与抢劫均早于顶替。其后两人交替被称作埃夫，保守取明确指代。
  early = {'第四章', '第五章', '第四十三章', '第四十七章', '第四十八章'}
  explicit = re.compile(r'真(?:正的|的)?埃夫|我、埃夫、赫德西')
  count = 0
  for volume, heading, body in sequel_chapters():
   if volume.startswith('第二部'):
    count += body.count('埃夫') if heading.split()[0] in early else len(explicit.findall(body))
  counts = {'诡秘之主':0, '宿命之环':count}
  term = '埃夫（初次会面前后及后文明指本人的段落）'
 if ident in {'miller_carter','bishop_miller'}:
  volume_prefix = '第二部' if ident == 'miller_carter' else '第三部'
  names = re.compile(r'米勒·卡特(?:先生)?|米勒|卡特先生' if ident == 'miller_carter' else '米勒')
  counts = {'诡秘之主':sum(len(names.findall(body)) for volume, heading, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith(volume_prefix)), '宿命之环':0}
  term = volume_prefix + ('：米勒·卡特 / 米勒 / 卡特先生' if ident == 'miller_carter' else '：米勒（含主教称呼）')
 if ident == 'auston_levitt':
  counts = {'诡秘之主':len(re.findall('奥斯顿(?!墓园)', dict(texts)['诡秘之主'])), '宿命之环':0}
  term = '奥斯顿（排除奥斯顿墓园）'
 if ident in {'simon','simon_giaro'}:
  # 第四部第十一章仍是萨瓦党人，此后节庆章节使用同名总督身份。
  count = 0
  for volume, heading, body in sequel_chapters():
   if ident == 'simon' and (volume.startswith(('第二部','第三部')) or (volume.startswith('第四部') and heading.startswith('第十一章 '))):
    count += body.count('西蒙')
   elif ident == 'simon_giaro' and volume.startswith('第四部'):
    # Only references to the man himself: lineage, appearance used for
    # impersonation, and the real candidate after the ceremony.
    original = re.compile(r'名叫西蒙|西蒙是吉亚罗家族的支系成员|和西蒙·吉亚罗同属于一个家族|变成西蒙的拉托|西蒙·吉亚罗(?:模样|的容貌)|伪装成待任“海之总督”西蒙·吉亚罗|真正的西蒙·吉亚罗')
    count += len(original.findall(body))
  counts = {'诡秘之主':0, '宿命之环':count}
  term = '西蒙（已区分同名与冒名）'
 if ident == 'kisma':
  # 第六部明确把这个职衔对应到克斯玛；第二部的馈赠只提职衔。
  counts['诡秘之主'] = sum(len(pattern.findall(body)) if volume.startswith('第六部') else body.count(short) for volume, heading, body in iter_chapters(*BOOKS[0][1:]))
 if ident == 'archbishop_anthony':
  # The first novel's occurrences were checked by chapter; the second novel's
  # Anthony is a different character and must not be included.
  counts['诡秘之主'] = dict(texts)['诡秘之主'].count('安东尼')
  counts['宿命之环'] = 0
  term = '安东尼（《诡秘之主》已核对章节）'
 if ident == 'charlie':
  # 诡秘之主中的查理·雷克及科尔杜村的同名男仆并非查理·科伦特。
  counts['诡秘之主'] = 0
  counts['宿命之环'] = sum(body.count('查理') for volume, chapter, body in sequel_chapters() if '第一部' not in volume and volume != '番外')
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
      for volume, heading, body in sequel_chapters())
  term='尼基拉 / 格里菲斯'
 if ident == 'bayenna':
  # “酒吧老板” is unambiguous in these two consecutive chapters only.
  counts['诡秘之主']=0
  counts['宿命之环']=sum(body.count('酒吧老板')
      for volume, heading, body in sequel_chapters()
      if volume.startswith('第五部') and heading.startswith(('第六十一章','第六十二章')))
  counts['宿命之环']+=dict(texts)['宿命之环'].count('拜恩纳')
  term='拜恩纳 / 酒吧老板（已核对两章）'
 if ident == 'christo':
  term = '克里斯托 / “老鼠”'
  smuggler = re.compile(r'(?:“老鼠”|‘老鼠’)(?:克里斯托)?|克里斯托(?!弗)')
  counts['宿命之环'] = sum(len(smuggler.findall(body)) for _, _, body in sequel_chapters())
 if ident == 'bulman':
  term = '布尔曼 / “魔鬼巫师”'
  pirate = re.compile(r"(?:[“‘]?魔鬼巫师[”’']?)?布尔曼|魔鬼巫师")
  counts = {'诡秘之主':0,'宿命之环':sum(len(pirate.findall(body)) for _, _, body in sequel_chapters())}
 if ident == 'mad_lady':
  term = '“疯女” / 疯女（已核对的单称）'
  counts = {'诡秘之主':0,'宿命之环':sum(len(re.findall(r'疯女(?!人)', body)) for _, _, body in sequel_chapters())}
 if ident == 'bard_april':
  term = '“吟游诗人” / 米格尔 / 假伊鲁 / “海之总督”（已确认冒名段落）'
  bard_name = re.compile(r'“吟游诗人”|‘吟游诗人’')
  assumed_role = re.compile(r'(?:假[“‘]海之总督[”’])?米格尔|假[“‘]海之总督[”’]')
  role_scenes = {'第五十八章','第五十九章','第六十八章','第七十章','第七十六章','第七十九章','第八十一章','第九十三章'}
  count = 0
  for volume, chapter, body in sequel_chapters():
   count += len(bard_name.findall(body))
   if volume.startswith('第四部') and chapter.split()[0] in role_scenes:
    count += len(assumed_role.findall(body))
   if volume.startswith('第四部') and chapter.split()[0] in {'第五十四章','第五十七章','第五十八章'}:
    count += len(re.findall(r'(?:现任|那位)“海之总督”', body))
   if volume.startswith('第四部') and chapter.split()[0] in {'第七十章','第七十三章'}:
    count += body.count('假伊鲁')
  counts = {'诡秘之主':0, '宿命之环':count}
 if ident == 'fernandez':
  counts['宿命之环'] = sum(body.count('费南德兹') for volume, _, body in sequel_chapters() if volume.startswith('第四部'))
 if ident == 'nast':
  term = '纳斯特 / 五海之王 / 白枫伯爵'
  title_or_name = re.compile(r'(?:[“‘]?(?:五海之王|白枫伯爵)[”’]?)?纳斯特(?:·所罗门)?|五海之王|白枫伯爵')
  counts = {book:0 for book, _ in texts}
  for book, text_path, encoding in reference_texts():
   counts[book] += sum(len(title_or_name.findall(body)) for _, _, body in iter_chapters(text_path, encoding))
 if ident == 'pallas_negan':
  counts['诡秘之主'] = negan_mentions['father']
  term = '帕拉斯·尼根 / 尼根公爵'
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
 if ident == 'bethel_abraham':
  # The corpus quotes either just 门 or the entire title, including in dialogue.
  title = r'(?:“门”先生|‘门’先生|“门先生”|‘门先生’|门先生)'
  personal_name = r'伯特利(?:[·.]亚伯拉罕)?'
  mentions = re.compile(rf'{title}(?:{personal_name})?|{personal_name}')
  counts = {'诡秘之主': 0, '宿命之环': 0}
  for book, path, encoding in reference_texts():
   counts[book] += sum(len(mentions.findall(body)) for _, _, body in iter_chapters(path, encoding))
  term = '伯特利 / “门”先生'
 if ident == 'sharron':
  mentions = re.compile(r'[“‘]节制[”’]女士(?:莎伦)?|被称为莎伦的保镖小姐|保镖小姐(?:，不，莎伦|莎伦)?|莎伦')
  counts = {book:len(mentions.findall(text)) for book, text in texts}
  term = '莎伦 / “节制”女士 / 保镖小姐'
 if ident == 'gilchies':
  mentions = re.compile(r'[“‘]屠杀者[”’](?:吉尔希艾斯)?|吉尔希艾斯')
  counts = {'诡秘之主':sum(len(mentions.findall(body)) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
  term = '吉尔希艾斯 / “屠杀者”'
 if ident == 'beatrice':
  reviewed = 0
  for volume, chapter, body in sequel_chapters():
   reviewed += len(re.findall(r'碧翠丝(?!的?项链)', body))
   if chapter.startswith(('第一百五十三章','第一百五十四章')) and ('阿黛娜' in body and '德丽莎' in body):
    reviewed += body.count('德丽莎') - body.count('真正的画商德丽莎')
   else:
    reviewed += body.count('假德丽莎')
   if volume.startswith('第三部') and chapter.startswith('第一百九十一章'):
    # “假德丽莎，也就是碧翠丝·安库尔”是同一次提及。
    duplicate = '假德丽莎，也就是碧翠丝·安库尔'
    if body.count(duplicate) != 1:
     raise ValueError('碧翠丝冒名去重依据发生变化：' + volume + ' ' + chapter)
    reviewed -= 1
  counts = {'诡秘之主':0,'宿命之环':reviewed}
  term = '碧翠丝 / 假德丽莎 / 德丽莎（已核对段落）'
 if ident in {'joyce','sirius'}:
  mentions = re.compile(r'乔伊斯(?:[·.]迈尔(?:先生)?)?|迈尔先生' if ident == 'joyce' else '西里斯')
  counts = {'诡秘之主':sum(len(mentions.findall(body)) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第一部')), '宿命之环':0}
  term = '乔伊斯 / 迈尔先生' if ident == 'joyce' else '西里斯'
 if ident == 'walter':
  counts['诡秘之主'] = sum(body.count('瓦尔特') for _, _, body in iter_chapters(*BOOKS[0][1:]))
 if ident == 'sallent':
  counts['宿命之环'] = sum(body.count('萨连特') for volume, _, body in sequel_chapters() if volume.startswith('第三部'))
 total=sum(counts.values())
 if total>10 or ident == 'simon_giaro':
  out.append(dict(id=ident,name=name,short=short,mark=short[0],alias={'klein':'周明瑞 / 格尔曼·斯帕罗 / 夏洛克·莫里亚蒂 / 道恩·唐泰斯 / 梅林·赫尔墨斯', 'bethel':'维尔杜·加西亚 / 维尔杜·加西亚·亚伯拉罕', 'patrick_bryan':'帕特里克·布莱恩（原文异写）', 'trissy':'特里斯', 'black_scorpion':'黑蝎', 'lilith':'曾使用欧弥贝拉之名 / 大地母神', 'audrey':'正义', 'alger':'倒吊人', 'fors':'魔术师', 'derrick':'太阳', 'emlyn':'月亮', 'cattleya':'隐者 / 星之上将 / 星之女王', 'leonard':'星星', 'xio':'审判', 'amon':'曾冒用忒尔弥波洛斯之名', 'amanises':'黑夜女神 / 厄运女神', 'roselle':'黄涛', 'bernadette':'神秘女王', 'bethel_abraham':'“门”先生', 'lumian':'夏尔 / 夏尔·杜布瓦 / 路易·贝里'}.get(ident,''),group=group,mentions=total,mentionTerm=term,counts=counts))
# Identity evidence is stored separately from literal counting; common aliases
# such as “夏尔” are searchable but not counted without disambiguation.
identity_sources = {
 'camus':[{'alias':'唐·吉维尔·加缪·卡斯蒂亚','source':'《宿命之环》第四部，第一百四十八章《拜访》'},{'alias':'加缪·卡斯蒂亚','source':'《宿命之环》第四部，第一百六十六章《“侦察工具”》'}],
 'steam_god':[{'alias':'工匠之神（旧称）','source':'《诡秘之主》第一部，第四章《占卜》；《诡秘之主》第八部，第二十四章《疯狂的呓语》'}],
 'patrick_bryan':[{'alias':'帕特里克·布莱恩（原文异写）','source':'《诡秘之主》第五部，第三十章《狂信徒》'}],
 'bethel':[{'alias':'维尔杜·加西亚 / 维尔杜·加西亚·亚伯拉罕','source':'《诡秘之主》第七卷，第四十五章《新的任务》'}],
 'bethel_abraham':[{'alias':'“门”先生','source':'《诡秘之主》第六部，第四十五章《“0”级》'}],
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
match_notes = {'sallent':'仅计第三部经营“高地秘药”的店主，第五部同名伦堡旅客另计。', 'true_creator':'“真实造物主”在不同阶段与亚当存在复杂身份关系；此处单列称号以保留融合前后的叙述。', 'ancient_sun':'仅统计“远古太阳神”字面写法；“造物主”等称号可能指不同存在，尚未直接合并。', 'david_raymond':'统计“戴维”的字面出现，可能包含同名人物；完整姓名出现十次。', 'patrick_bryan':'合计完整姓名的“布雷恩”和“布莱恩”两种写法；与帕特里克·杰森分别计数。', 'cattleya':'包含“嘉德丽雅”“星之上将”“星之女王”的字面匹配，称号与姓名连写只计一次；代号“隐者”暂未计入。', 'bernadette':'包含“贝尔纳黛”和“神秘女王”的字面匹配；仍需结合语境核对。', 'soest':'排除了“特伦索斯特”中的命中；其他同名用法仍需核对。', 'goodwill':'排除紧随“化工厂”的命中；仅写姓氏时可能指家族或其他人。', 'groselle':'排除了《格罗塞尔游记》书名的直接命中，其余字面结果仍需消歧。', 'hermes':'排除了明显的“古赫密斯”、赫密斯语及赫密斯文命中；其余字面结果仍可能指文字或语言。', 'ormir':'排除了“奥尔米尔葡萄酒”的命中；其他同名用法仍需人工核查。', 'lilith':'只统计“莉莉丝”，不将有其他历史身份的大地母神或欧弥贝拉字面命中直接算入。', 'medici':'排除了完整写作“阿不思·梅迪奇”及“梅迪奇家族”的命中；其他仅写姓氏的语境仍有歧义。', 'termiboros':'该名字既指真正的忒尔弥波洛斯，也曾被阿蒙冒用；字面次数未区分两者。', 'amon':'阿蒙曾冒用忒尔弥波洛斯的名字，相关歧义称呼未计入阿蒙的字面次数。', 'amanises':'包含“阿曼妮西斯”和“黑夜女神”的字面匹配；其他称号尚未计入。', 'roselle':'包含“罗塞尔”和“黄涛”的字面匹配，梦境形象等语境仍需人工区分。', 'ryan':'排除了“克莱恩”中的相同字串，仅统计《宿命之环》。', 'guillaume':'排除明确指向纪尧姆·利齐耶、纪尧姆·皮埃尔、纪尧姆·贝里及皮埃尔·纪尧姆的写法，以及“小纪尧姆”和“纪尧姆叔叔”；单独的纪尧姆仍可能有歧义。', 'frye':'排除了“弗莱娅”和“汉弗莱”中的命中；仍可能有其他同名。', 'lumian':'含“战车”先生、“卢米安”“路易·贝里”和“夏尔·杜布瓦”；单独的“夏尔”有歧义，尚未计入。'}
# Classification evidence preserves the wording and period in the text. It is
# deliberately not inferred from relationship tags or the broad UI group.
classification_evidence = {
 'max_livermore':[{'kind':'organization','value':'机械之心','source':'《诡秘之主》第二部，第一百零六章《奥黛丽的“冒险”》','note':'负责纪念展安保的西区小队队长。'}],
 'portland_momont':[{'kind':'sequence','value':'鉴定师','source':'《诡秘之主》第七卷，第七章《可怜的阿罗德斯》','note':'原文明示其当时为序列7。'}],
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
 ('jodson','错误','《诡秘之主》第五部，第一百八十八章《“门”先生》','克莱恩明确将黄金梦想号三副约德森列为偷盗者途径的人选。','confirmed'),
 ('hazel','错误','《诡秘之主》第五部，第一百八十七章《诵念》','克莱恩定期检查海柔尔是否受阿蒙影响时，明确提到她本人属于偷盗者途径。','confirmed'),
 ('zarathustra','愚者','《宿命之环》第六部，第六十三章《等价交换》','芙兰卡推测其为占卜家途径天使，身份判断仍存疑。','inferred'),
 ('raft','黑皇帝','《诡秘之主》第二部，第六十四章《敲定方案》','克莱恩推测拉夫特可能利用律师途径的能力应对入梦和通灵，具体序列未明。','inferred'),
 ('leodero','暴君','《诡秘之主》第六部，第三十五章《重现》','高希纳姆称列奥德罗占据风暴神座，称其为“暴君”。','confirmed'),
 ('aucuses','太阳','《诡秘之主》第七卷，第八十章《“空想家”的特殊》','原文指出“纯白天使”奥赛库斯包容太阳途径序列1。','confirmed'),
 ('brown_sauron','魔女','《宿命之环》第三部，第一百三十五章《人血面包》','原文直接称布朗丝·索伦为魔女。','confirmed'),
 ('periodic_table','隐者','《宿命之环》第五部，第七十七章《奇怪的试卷》','根据聚会中对巫师的反应推断，个体身份仍待复核。','inferred'),
 ('isotope','隐者','《宿命之环》第五部，第七十八章《“巫师”们的异常》','聚会中他与其他巫师一同遭知识灌输，据此判断其途径。','inferred'),
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
classification_evidence.setdefault('wendell', []).extend([
 {'kind':'sequence','value':'治安官','source':'《诡秘之主》第七卷，第六十五章《助人为乐》','note':'文德尔记得走过的道路，叙述明确他曾是治安官。'},
 {'kind':'sequence','value':'审讯者','certainty':'inferred','source':'《诡秘之主》第七卷，第六十四章《入住》、第六十五章《助人为乐》','note':'由现为序列7及曾是治安官推定当时的魔药名称。'}
])
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
 {'kind':'pathway','value':'死神','source':'《宿命之环》第四部，第一百九十章《幻觉》','note':'卢米安认出雷亚萨是死神途径的中序列非凡者。'},
 {'kind':'organization','value':'灵教团皇室派','source':'《宿命之环》第四部，第一百九十九章《一场“交易”》、第二百零四章《罪在何处》','note':'麦斯洛说明两人同属灵教团；卢米安后来说明两人属于皇室派。'}
])
classification_evidence.setdefault('maislo', []).append({
 'kind':'organization','value':'灵教团皇室派','source':'《宿命之环》第四部，第一百九十九章《一场“交易”》、第二百零四章《罪在何处》',
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
classification_evidence.setdefault('harry_owl', []).append({'kind':'pathway','value':'观众','certainty':'inferred','source':'《诡秘之主》第三部，第一百二十一章《条件》','note':'克莱恩根据猫头鹰观察人的方式作出推测，未点明具体序列。'})
classification_evidence.setdefault('gandalf', []).append({'kind': 'pathway', 'value': '战士', 'source': '《宿命之环》第四部，第八十七章《差距》', 'note': '洛基调查过研究会会长，确认他是战士途径的非凡者。'})
classification_evidence.setdefault('gusin', []).append({'kind': 'pathway', 'value': '猎人', 'source': '《宿命之环》第五部，第七十七章《奇怪的试卷》', 'note': '瓦纳克称古辛为猎人，并说他拥有魔女途径的部分能力。能力的来源和具体序列尚待核实。'})
classification_evidence['gusin'].append({
 'kind': 'pathway', 'value': '刺客', 'relation': 'ability',
 'source': '《宿命之环》第五部，第七十七章《奇怪的试卷》',
 'note': '瓦纳克称古辛拥有部分魔女途径能力，能够利用镜中世界。获得方式未明。'
})

classification_evidence.setdefault('richard_fate', []).append({'kind': 'pathway', 'value': '怪物', 'certainty': 'inferred', 'source': '《诡秘之主》第三部，第一百二十九章《命运议员》、第一百三十章《到手》、第二百零七章《这就好了？》', 'note': '瑞乔德收容概率之骰；克莱恩后来将他预感危险的表现联系到怪物途径。命运议员是组织职务，具体序列未明。'})
classification_evidence.setdefault('ailos', []).append({'kind': 'pathway', 'value': '猎人', 'source': '《宿命之环》第三部，第一百六十八章《三个猎人一台戏》', 'note': '爱洛丝在地宫中向阿不思和卢米安说明自己的索伦血统，并亲口说自己是猎人。'})
classification_evidence.setdefault('albus', []).append({'kind': 'pathway', 'value': '猎人', 'source': '《宿命之环》第三部，第一百六十八章《三个猎人一台戏》；第五部，第九十六章《不对劲》', 'note': '卢米安称阿不思和爱洛丝为猎人。当时卢米安只怀疑阿不思已经是阴谋家；摩罗拉时期他能短暂借用军团的高位力量，个人的具体序列仍待核实。'})
classification_evidence.setdefault('omabella', []).append({'kind': 'pathway', 'value': '耕种者', 'certainty': 'inferred', 'source': '《宿命之环》第七部，第二十五章《吉达斯》、第二十六章《第一个牧师》', 'note': '卢米安等人重建往事时，将巨人王后的力量归入大地途径。莉莉丝曾窃取她的身份，莉莉丝的真神位阶不能直接记在王后名下。'})
classification_evidence.setdefault('ormir', []).append({'kind': 'pathway', 'value': '战士', 'certainty': 'inferred', 'source': '《诡秘之主》第一部，第一百八十章《聪明人总是想太多》；第二部，第一百章《古老的神灵》', 'note': '奥尔米尔是第二纪巨人王。克莱恩根据巨人王庭掌握的战士序列，推测祂是远古战神。原文此处未交代祂的个人晋升过程。'})
classification_evidence.setdefault('brignais', []).append({'kind': 'pathway', 'value': '阅读者', 'certainty': 'inferred', 'source': '《宿命之环》第三部，第五十一章《集众之力》', 'note': '卢米安根据布里涅尔的信仰、战斗方式和处理帮务的表现，推测他是阅读者途径的非凡者；该章没有点明序列。'})
classification_evidence.setdefault('mr_a', []).append({'kind':'pathway','value':'倒吊人','source':'《诡秘之主》第四部，第一百零四章《“投食”》','note':'克莱恩提及A先生具有“蔷薇主教”的能力；该序列属于秘祈人途径。'})
# Explicit nationality descriptions in the cited chapters; do not infer from residence.
for ident, facts in {
 'klein': [('塔罗会','《诡秘之主》第一部，第七章《代号》'), ('廷根市占卜俱乐部','《诡秘之主》第一部，第四十八章《海纳斯·凡森特》')],
 'audrey': [('心理炼金会','《诡秘之主》第二部，第二百零五章《心灵的力量》'), ('鲁恩慈善助学基金','《诡秘之主》第五部，第二十四章《募捐的天赋》')],
 'leonard': [('红手套','《诡秘之主》第二部，第一百八十九章《挖掘》'), ('塔罗会','《诡秘之主》第五部，第十三章《新人和新人也是不一样的》')],
 'ryan': [('机械之心','《宿命之环》第一部，第八十章《联合调查组》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'lia': [('第八局','《宿命之环》第一部，第八十章《联合调查组》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'valentine': [('永恒烈阳教会宗教裁判所','《宿命之环》第一部，第一百零八章《报告》'), ('科尔杜村联合调查组','《宿命之环》第一部，第八十章《联合调查组》')],
 'alger': [('风暴教会','《诡秘之主》第一部，第一百七十章《铜哨》'), ('海神教会','《诡秘之主》第八部，第六章《选择》')],
 'fors': [('塔罗会','《诡秘之主》第二部，第九十七章《大气污染调查委员会》')],
 'xio': [('塔罗会','《诡秘之主》第五部，第十章《门后的东西》'), ('军情九处','《诡秘之主》第八部，第一章《这一晚》')],
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
 if entry['id'] == 'hermes':
  entry['alias'] = '“暴怒”先生'
  entry['aliasSources'].append({'alias':'“暴怒”先生（巨型白兔的身份）','source':'《诡秘之主》第八部，第六章《选择》、第十一章《行动派》、第十二章《摧毁》'})
  entry['matchNote'] = '合计人名、“暴怒”先生及带此称号的兔子。面具或情绪的单称、赫密斯语和文字名称不计。'
 if entry['id'] == 'delllau':
  entry['alias'] = '“黑座之王”巴洛斯·霍普金斯 / 埃里克·德雷克 / 埃里克·德里克'
  entry['aliasSources'].extend([{'alias':'“黑座之王”巴洛斯·霍普金斯、埃里克·德雷克','source':'《诡秘之主》第七卷，第五十章《陌生的城市》'},{'alias':'埃里克·德里克（隐士姓名异写）','source':'《诡秘之主》第八部，第十二章《摧毁》'}])
  entry['matchNote'] = '合计本姓、海盗称号及海盗与隐士的全名，称号与姓名连写只计一次。红手套队长埃里克另计。'
 if entry['id'] == 'sharron':
  entry['alias'] = '保镖小姐 / “节制”'
  entry['aliasSources'].append({'alias':'保镖小姐','source':'《诡秘之主》第二部，第六十五章《免费？》、第六十六章《乐极生悲》'})
  entry['aliasSources'].append({'alias':'“节制”','source':'《宿命之环》第八部，第十八章《战场的变化》'})
  entry['matchNote'] = '合计莎伦、保镖小姐和“节制”女士，称号与姓名连写或当场改口只计一次。单独出现的牌名、理念和派系名不计。'
 if entry['id'] == 'gilchies':
  entry['alias'] = '“屠杀者”'
  entry['aliasSources'].append({'alias':'“屠杀者”','source':'《诡秘之主》第三部，第一百五十四章《“屠杀者”》'})
  entry['matchNote'] = '合计章节正文中的姓名和带引号的绰号，两者连写时计一次。'
 if entry['id'] == 'joyce':
  entry['alias'] = '迈尔先生'
  entry['aliasSources'].append({'alias':'迈尔先生','source':'《诡秘之主》第一部，第五十五章《启示》、第六十三章《解梦》'})
 if entry['id'] == 'camus':
  entry['alias'] = ' / '.join(item['alias'] for item in entry['aliasSources'])
 entry['classificationEvidence'] = classification_evidence.get(entry['id'], [])
 if entry['id'] == 'sharf':
  entry['alias'] = '工匠夏尔夫'
  entry['aliasSources'].append({'alias':'姓朱恩','source':'《诡秘之主》第四部，第一百九十一章《后遗症》'})
  entry['matchNote'] = '仅统计“夏尔夫”字面出现，单独的“工匠”未计入。'
 if entry['id'] == 'djinni':
  entry['alias'] = '“混沌之子”的主意识'
  entry['aliasSources'].append({'alias':'“混沌之子”的主意识','source':'《宿命之环》第七部，第五十五章《序列之上》'})
  entry['matchNote'] = '仅统计“灯神”字面出现；神灯这一物品名称未直接计入。'
 if entry['id'] == 'pallez':
  entry['alias'] = '老头（伦纳德的称呼） / “时之天使”（愚者教会）'
  entry['aliasSources'].append({'alias':'老头（伦纳德的称呼）','source':'《诡秘之主》第四部，第一百四十五章《谁的陷阱》'})
  entry['aliasSources'].append({'alias':'“时之天使”（愚者教会）','source':'《宿命之环》第八部，第十六章《各自的准备》'})
  entry['matchNote'] = '统计“帕列斯”及《宿命之环》六章中已核对的愚者教会“时天使”称号；其他章节的同称号和“老头”等称呼尚未计入。'
 if entry['id'] == 'azik':
  entry['alias'] = '“死亡执政官”（拜朗帝国时期）'
  entry['aliasSources'].append({'alias':'“死亡执政官”（拜朗帝国时期）','source':'《诡秘之主》第三部，第一百零六章《旧相识》'})
  entry['matchNote'] = '仅统计“阿兹克”的字面出现；“死亡执政官”也指拜朗帝国的职位和序列名称，尚未按上下文并入。'
 if entry['id'] == 'bethel_abraham':
  entry['alias'] = '“门”先生 / 亚盖慈（精神烙印的梦境形象）'
  entry['aliasSources'].append({'alias':'亚盖慈（精神烙印的梦境形象）','source':'《宿命之环》第六部，第七十九章《夜半》'})
  entry['matchNote'] = '合计“伯特利”与“门”先生；梦境形象亚盖慈尚未计入。'
 if entry['id'] == 'lady_moon':
  entry['alias'] = '月夫人 / 孕育神灵的女士'
  entry['matchNote'] = '合计第二部先后使用的月夫人、月女士两种称呼。'
  entry['aliasSources'].append({'alias':'月夫人', 'source':'《宿命之环》第二部第六十一章《夜游会》、第一百二十章《等价交换》'})
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
  entry['matchNote'] = '合计正文中的本名、明确称作假德丽莎的提及，以及第三部第一百五十三至一百五十四章经核对指向冒名者的德丽莎。排除真画商和同名项链。'
 if entry['id'] == 'pallas_negan':
  entry['alias'] = '尼根公爵（遇刺前在任）'
  entry['aliasSources'].append({'alias':'尼根公爵','source':'《诡秘之主》第一部，第八章《新的时代》；第四部，第九章《管家》'})
  entry['matchNote'] = '本名与爵号连写计一次。计入身后对刺杀案的追述及前期府邸等间接提及。后文提及现任公爵、家族或代际不明的爵号另行区分。'
 if entry['id'] == 'steam_god':
  entry['alias'] = '工匠之神（旧称）'
  entry['matchNote'] = '仅统计“蒸汽与机械之神”字面命中，其中包括教会名称等间接提及；旧称“工匠之神”未纳入计数。'
 if entry['id'] == 'leomaster':
  entry['alias'] = '黑之圣者'
  entry['aliasSources'].append({'alias':'黑之圣者','source':'《诡秘之主》第三部，第一百八十九章《第四个名字》'})
  entry['matchNote'] = '统计“利奥马斯特”和“黑之圣者”的字面匹配，邻接的称号和姓名只计一次；不同人格未分开统计。'
 if entry['id'] == 'hilaire':
  entry['alias'] = '“橘光” / 希拉里恩 / 赫尔莫修因曾自称希拉里昂'
  entry['aliasSources'].append({'alias':'希拉里恩（原文异写）','source':'《诡秘之主》第三部，第二百四十二章《提醒的真正含义》'})
  entry['aliasSources'].append({'alias':'橘光；赫尔莫修因曾自称希拉里昂','source':'《诡秘之主》第三部，第二百四十一章《今天又做了件好事》、第二百四十二章《提醒的真正含义》'})
  entry['matchNote'] = '合计希拉里昂、原文异写希拉里恩与橘光称号。称号和姓名连写只计一次；赫尔莫修因另有档案。'
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
  entry['alias'] = '“幽暗圣者”'
  entry['aliasSources'].append({'alias':'幽暗圣者','source':'《诡秘之主》第六部，第四十四章《狮子搏兔》'})
  entry['matchNote'] = '计入克斯玛的姓名及《诡秘之主》第六部“幽暗圣者”的称号；称号紧邻姓名时合计一次。第二部仅以职衔提及的一次馈赠未计入。'
 if entry['id'] == 'butis':
  entry['alias'] = '“秘之圣者”'
  entry['aliasSources'].append({'alias':'秘之圣者','source':'《诡秘之主》第五部，第一百三十章《多里安的请求》'})
  entry['matchNote'] = '计入姓名布提斯及称号“秘之圣者”；称号紧邻姓名时合计一次。含其他人物谈论其身份的段落。'
 if entry['id'] == 'jorg_neuins':
  entry['alias'] = '“巨鲨”'
  entry['aliasSources'].append({'alias':'“巨鲨”','source':'《宿命之环》第五部，第四十八章《上船》'})
  entry['matchNote'] = '仅统计姓名约尔格。巨鲨也可指动物，单独出现时未计入。'
 if entry['id'] == 'rozanne':
  entry['matchNote'] = '统计《诡秘之主》中的姓名，以及《宿命之环》第六部中介绍现实背景、保护措施和卷末母女同行时对本人的点名。'
 if entry['id'] == 'xio':
  entry['matchNote'] = '计入全名、休小姐、休女士及带有“审判”的姓名和人物称呼，连写计一次。单字休和单独牌名未计入，次数为下限。'
 if entry['id'] == 'danitz':
  entry['alias'] = '“烈焰”'
  entry['aliasSources'].append({'alias':'“烈焰”','source':'《诡秘之主》第三部，第十七章《招揽》；《宿命之环》第三部，第二十八章《大人物》'})
  entry['matchNote'] = '统计姓名和带引号的绰号“烈焰”，对话中的内层引号亦计入。绰号紧接姓名时计一次。'
 if entry['id'] == 'yann':
  entry['alias'] = '“海王”（序列称呼）'
  entry['aliasSources'].append({'alias':'“海王”','source':'《诡秘之主》第三部，第五十九章《访客》'})
  entry['matchNote'] = '统计全名与姓氏考特曼。单称“海王”也可能指序列或其他非凡者，未计入。'
 if entry['id'] == 'renthas':
  entry['alias'] = '假埃夫（冒用身份）'
  entry['aliasSources'].append({'alias':'假埃夫','source':'《宿命之环》第二部，第一百零二章《通灵》、第一百零三章《“演员”》'})
  entry['matchNote'] = '合计伦塔司、假埃夫及假的埃夫。称呼紧接本名时计一次。'
 if entry['id'] == 'eve':
  entry['matchNote'] = '保守计数。收录第二部第四、五、四十三、四十七、四十八章对旅馆老板的称呼，以及后文明称真埃夫、真正的埃夫、真的埃夫和伦塔司列举同伙的提及。'
 if entry['id'] == 'hal_constantine':
  entry['alias'] = '“深海中将” / “深海上将”'
  entry['aliasSources'].append({'alias':'深海中将','source':'《诡秘之主》第二部，第七十九章《交流消息》'})
  entry['aliasSources'].append({'alias':'深海上将','source':'《宿命之环》第四部，第十八章《奇特的海盗船》'})
  entry['matchNote'] = '统计完整姓名和“深海中将”“深海上将”，合并直接连写的称号与姓名；排除哈尔曼港和曼哈尔鱼。次数含他人谈论其身份的段落。'
 if entry['id'] == 'roselle':
  entry['matchNote'] = '排除格罗塞尔和明称镜中罗塞尔之处。续作的“黄涛”仅计明确谈及大帝本名之处。单称罗塞尔的行文仍可能涉及他人讨论其梦境形象。'
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
 if entry['id'] == 'great_mother':
  entry['alias'] = '“堕落母神” / ' + entry['alias']
  entry['aliasSources'].append({'alias':'“堕落母神”','source':'《宿命之环》第七部，第五十五章《序列之上》'})
  entry['matchNote'] = '统计“伟大母亲”和“堕落母神”的字面出现。'
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
 if entry['id'] == 'ost':
  entry['name'] = '奥斯塔·特鲁尔'
 if entry['id'] == 'fidel':
  entry['name'] = '菲德尔·格拉'
 if entry['id'] == 'simon_giaro':
  entry['matchNote'] = '仅计明确指向真正候任者的名字，包括说明其家世、原貌与仪式后人选的段落。拉托假扮西蒙在船上行动时的称呼另行区分。'
 if entry['id'] == 'simon':
  entry['alias'] = '“巨人”（萨瓦党绰号）'
  entry['aliasSources'].append({'alias':'“巨人”（萨瓦党绰号）','source':'《宿命之环》第二部，第四十七章《房东》'})
  entry['matchNote'] = '计入第二、三部及第四部第十一章的萨瓦党人西蒙；排除西蒙·吉亚罗和西蒙娜夫人；“巨人”可能指种族或其他人物，未计入。'
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
  entry['alias'] += ' / 愚者 / 世界（塔罗会身份） / “魔法师”（贝尔丹）'
  entry['aliasSources'].append({'alias':'“魔法师”（贝尔丹众人对梅林的称呼）','source':'《诡秘之主》第七卷，第十六章《罪名》、第十八章《限制的漏洞》、第二十四章《完成愿望》'})
  entry['aliasSources'].append({'alias':'愚者（塔罗会身份）','source':'《诡秘之主》第一部，第七章《代号》'})
  entry['aliasSources'].append({'alias':'世界（塔罗会身份）','source':'《诡秘之主》第二部，第五十一章《五人聚会》'})
  entry['matchNote'] = '统计克莱恩、周明瑞及列出的部分身份姓名，另计贝尔丹已核对章节中的“魔法师”；“愚者”“世界”具有其他含义或指代，暂未直接计入。'
 if entry['id'] == 'green_dream':
  entry['matchNote'] = '“格林”字面匹配可能包括其他人名或地名；《宿命之环》中主要出现的是罗塞尔追随者格林的梦境形象。'
 if entry['id'] == 'jiangyue_dream':
  entry['matchNote'] = '江月出现在梦境都市，不能据此认定现实中存在对应人物。'
 if entry['id'] == 'charlie':
  entry['matchNote'] = '只统计《宿命之环》第二部及之后的“查理”；排除《诡秘之主》的查理·雷克和第一部科尔杜村的同名男仆，其他同名用法仍需核查。'
 if entry['id'] == 'kali':
  entry['alias'] = '卡利'
  entry['aliasSources'].append({'alias':'卡利','source':'《宿命之环》第四部，第一百六十八章《深夜》'})
  entry['matchNote'] = '统计本名与神甫称呼，排除“芙兰卡利用……”形成的跨词匹配。'
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
 if entry['id'] == 'fernandez':
  entry['matchNote'] = '仅计第四部桑塔港奥罗家族成员的全名与短名；第二部同名走私者单列。'
 if entry['id'] == 'christo':
  entry['matchNote'] = '合计姓名与带引号的绰号，连写计一次。排除动物称呼及克里斯托弗主教。'
  entry['alias'] = '“老鼠”'
  entry['aliasSources'].append({'alias':'“老鼠”','source':'《宿命之环》第二部，第四十六章《简娜》、第七十七章《奇怪的脚印》'})
 if entry['id'] == 'nast':
  entry['name'] = '纳斯特·所罗门'
  entry['alias'] = '“五海之王” / 白枫伯爵'
  entry['aliasSources'].extend([{'alias':'纳斯特·所罗门 / “五海之王”','source':'《诡秘之主》第二部，第二十四章《序列2》'},{'alias':'白枫伯爵','source':'《诡秘之主》第五部，第二十五章《克制》、第二十六章《纳斯特的回忆》'}])
  entry['matchNote'] = '按两部小说的章节正文统计，称号紧接姓名时只计一次，含悬赏、传闻与回忆中的提及。'
 if entry['id'] == 'bird_mustan':
  entry['alias'] = '“恐惧子爵”'
  entry['aliasSources'].append({'alias':'“恐惧子爵”','source':'《诡秘之主》第五部，第二十五章《克制》'})
 if entry['id'] == 'ian':
  entry['name'] = '伊恩·赖特'
  entry['aliasSources'].append({'alias':'伊恩','source':'《诡秘之主》第二部，第九章《第一单委托》、第十四章《发明家雷帕德》'})
  entry['matchNote'] = '按“伊恩”计数，全名“伊恩·赖特”中的姓名只计一次。'
 if entry['id'] == 'julien_jenna':
  entry['matchNote'] = '只统计《宿命之环》中的“朱利安”；《诡秘之主》中有同名的萨默尔家女仆。已逐章核对从工厂火灾到婚后的姓名用法。'
 if entry['id'] == 'patrick':
  entry['matchNote'] = '该名称涉及人皮伪装与误导；调查者一度将其与“欲望使徒”混为一人，后续揭示是两个人。字面次数没有区分使用者。'
 if entry['id'] == 'jason':
  entry['matchNote'] = '统计“欲望使徒”的字面出现，其中可能包括序列名称或其他使用者；帕特里克·杰森·贝利亚涉及两人的误导性身份，未作为此人的确定姓名。'
 if entry['id'] in {'bruce_walls','orpheus_ship'}:
  entry['alias'] = '“美食家”' if entry['id'] == 'bruce_walls' else '“歌唱家”'
  entry['aliasSources'].append({'alias':entry['alias'],'source':'《诡秘之主》第三部，第二百一十章《嫌疑犯》'})
  entry['matchNote'] = '统计第三部已确认的姓名与带引号的绰号；绰号和姓名连写计一次。'
 if entry['id'] == 'jodson':
  entry['alias'] = '“花领结”'
  entry['aliasSources'].append({'alias':'“花领结”','source':'《诡秘之主》第三部，第二百零八章《信使小姐》'})
  entry['matchNote'] = '合计姓名与原文带引号的绰号，绰号后紧跟姓名计一次。'
 if entry['id'] == 'darkwill':
  entry['alias'] = '胖药师'
  entry['aliasSources'].append({'alias':'胖药师','source':'《诡秘之主》第三部，第一百零三章《买药》、第一百零四章《告别与再会》'})
  entry['matchNote'] = '合计姓名和原文已确认的“胖药师”称呼。同一处并列点明姓名与称呼时计一次。'
 if entry['id'] == 'lanervus':
  entry['alias'] = '埃尔 / 凯文'
  entry['aliasSources'].append({'alias':'埃尔（假名）','source':'《诡秘之主》第一部，第一百七十四章《雪伦夫人》'})
  entry['aliasSources'].append({'alias':'凯文（码头工人协会宿舍用名）','source':'《诡秘之主》第二部，第七十五章《充满象征意味的现场》'})
  entry['matchNote'] = '埃尔仅计第一部第一百七十四至一百七十五章的探视记录与复述；凯文仅计第二部第七十五章宿舍调查中的称呼。'
 if entry['id'] == 'mahti_mori':
  entry['matchNote'] = '统计“莫里·马赫特”和“马赫特议员”；单独出现的姓氏未计入。'
 if entry['id'] in {'mountbatten','byers','luka','jasmin','nikira','madame_michel','bram'}:
  entry['matchNote'] = '按名字字面统计，可能包括同名人物或其他用法，仍需逐处消歧。'
 if entry['id'] == 'ruhr':
  entry['matchNote'] = '计入鲁尔先生及鲁尔夫妇等称呼，排除奥斯塔·特鲁尔和欧鲁尔安姓名中的重叠字。'
 if entry['id'] == 'xu_xinyang':
  entry['alias'] = '徐队长'
  entry['aliasSources'].append({'alias':'徐队长','source':'《宿命之环》第六部，第五十七章《“相认”》、第六十五章《行动提纲》'})
  entry['matchNote'] = '合计徐新阳与徐队长在所提供原文中的字面提及，包含相邻两章重复写出的工作指派。'
 if entry['id'] == 'antigonus':
  entry['alias'] = '安小天（梦境形象）'
  entry['aliasSources'].append({'alias':'安小天（对应梦境形象）','source':'《宿命之环》第六部，第八十七章《往事》'})
  entry['matchNote'] = '统计“安小天”及排除紧随“家族”“笔记”的“安提哥努斯”；其他家族、遗物语境仍可能混入。梦境形象不等同于本人。'
 if entry['id'] == 'frank':
  entry['alias'] = '李克己（梦境形象；原文文件亦作李克已）'
  entry['aliasSources'].append({'alias':'李克己（对应梦境形象）','source':'《宿命之环》第六部，第七十六章《精神病科》'})
  entry['matchNote'] = '包含“弗兰克”及其梦境形象“李克己”“李克已”的字面匹配；后者为所提供原文文件中的异写，梦境经历与现实经历需区分。“弗兰克”可能有其他同名用法。'
 if entry['id'] == 'anderson':
  entry['name'] = '安德森·胡德'
  entry['alias'] = '“一个让你印象深刻的名字”（梦境都市网名）'
  entry['aliasSources'].append({'alias':'“一个让你印象深刻的名字”','source':'《宿命之环》第六部，第六十六章《约饭》'})
 if entry['id'] == 'will':
  entry['alias'] = '威尔·昂塞汀（异写）'
  entry['aliasSources'].append({'alias':'威尔·昂塞汀','source':'《诡秘之主》第三部，第二百零七章《这就好了？》；第四部，第四十章《瓦尔特的异常》'})
  entry['matchNote'] = '统计两书的完整姓名，合并昂赛汀、昂塞汀及原文分隔点异写。单称威尔另有同名与姓名片段，未计入。'
 if entry['id'] == 'radar':
  entry['alias'] = '“深蓝主祭”'
  entry['aliasSources'].append({'alias':'“深蓝主祭”','source':'《诡秘之主》第五部，第八十四章《联合行动》'})
 if entry['id'] == 'archbishop_anthony':
  entry['alias'] = '圣安东尼 / 圣者安东尼'
  entry['aliasSources'].append({'alias':'圣安东尼 / 圣者安东尼','source':'《诡秘之主》第二部，第二百六十一章《埃德萨克的“故事”》；第三部，第一百三十八章《替身任务》'})
  entry['matchNote'] = '按章节核对《诡秘之主》中“安东尼”的字面出现，含“圣安东尼”“圣者安东尼”和完整姓名；不合并《宿命之环》的安东尼·瑞德。'
 if entry['id'] == 'lumian':
  entry['alias'] += ' / 李明（梦境假名） / 卢米安娜（梦境形象） / “战车”'
  entry['aliasSources'].append({'alias':'“战车”','source':'《宿命之环》第六部，第一百五十章《塔罗会》；第七部，第四章《团队》'})
  entry['aliasSources'].append({'alias':'李明（梦境假名）','source':'《宿命之环》第六部，第三十六章《宛若真实》'})
  entry['aliasSources'].append({'alias':'卢米安娜（梦境形象）','source':'《宿命之环》第六部，第九十八章《利用漏洞》、第一百零四章《父女》'})
  entry['matchNote'] = '含“战车”先生、“卢米安”“路易·贝里”“夏尔·杜布瓦”和梦境假名“李明”；“卢米安娜”因包含“卢米安”而计入，已排除姓名与“明明”连写产生的“李明”误匹配；梦境形象需与现实经历区分；单独的“夏尔”尚未计入。'
 if entry['id'] == 'anthony':
  entry['alias'] = '安瑞德（梦境假名）'
  entry['aliasSources'].append({'alias':'安瑞德（梦境假名）','source':'《宿命之环》第六部，第三十九章《价格》'})
  entry['matchNote'] = '仅统计《宿命之环》中“安东尼”和梦境假名“安瑞德”的字面出现；安东尼存在同名人物，其他同名语境仍需核查，梦境经历与现实经历需区分。'
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
  entry['matchNote'] = '合计“拉托”和“咸蛋超人”的字面匹配，连写按一次计数；排除埃拉托区及布拉托夫的姓名。第三部的“咸蛋超人”均为愚人节成员称呼，其他章节仍需逐处核查。'
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
 if entry['id'] == 'bulman':
  entry['alias'] = '“魔鬼巫师”'
  entry['aliasSources'].append({'alias':'“魔鬼巫师”','source':'《宿命之环》第四部，第二十六章《魔鬼巫师》'})
  entry['matchNote'] = '合计正文中的本名与绰号，连写只计一次，含悬赏及死后回忆。'
 if entry['id'] == 'mad_lady':
  entry['aliasSources'].append({'alias':'“疯女”（研究会代号）','source':'《宿命之环》第三部，第一百一十四章《更早的穿越者》'})
  entry['matchNote'] = '计研究会代号及第四部第九十六章未加引号的本人称呼。排除布里乌旅馆事件中形容他人的“疯女人”。'
 if entry['id'] == 'bard_april':
  entry['alias'] = '曾冒用水手伊鲁·爱德拉、渔业公司职员米格尔的身份'
  entry['aliasSources'].append({'alias':'冒用伊鲁及米格尔身份，同一人扮演假“海之总督”','source':'《宿命之环》第四部，第七十章《各自的角色》、第七十九章《“吟游诗人”》'})
  entry['matchNote'] = '计带引号的研究会代号、冒名期间的米格尔及已核对的假总督、假伊鲁称呼。单称职衔、职业和真水手伊鲁的名字未合计。'
 if entry['id'] in {'professor','associate_professor','condensed_matter','periodic_table','isotope','underworld_taoist'}:
  entry['matchNote'] = '仅统计带中文引号的完整代号；其他标点写法和未加引号的称呼未计入。'
 if entry['id'] == 'gandalf':
  entry['matchNote'] = '按代号“甘道夫”字面统计；普通的同名文化引用仍可能混入。'
 if entry['id'] == 'leodero':
  entry['alias'] = '风天使 / 风暴之主'
  entry['aliasSources'].append({'alias':'风天使 / 风暴之主','source':'《诡秘之主》第六部，第九十六章《遵从心的意愿》'})
  entry['matchNote'] = '包含“列奥德罗”和“风暴之主”的字面匹配；教会名称、祷文和其他间接提及尚未逐处区分。'
 if entry['id'] == 'aucuses':
  entry['alias'] = '纯白天使 / 永恒烈阳'
  entry['aliasSources'].append({'alias':'纯白天使 / 永恒烈阳','source':'《诡秘之主》第五部，第一百七十一章《最强组织》、第一百七十二章《克莱恩的畏惧》'})
  entry['matchNote'] = '仅统计“奥赛库斯”的字面提及；称号“永恒烈阳”可指向教会、祈祷对象等，未纳入次数。'
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
  entry['alias'] = '命运天使 / 吞尾者 / 乌珞琉斯（原文异写）'
  entry['aliasSources'].append({'alias':'命运天使 / 吞尾者','source':'《诡秘之主》第二部，第二百五十三章《吞尾者》'})
  entry['aliasSources'].append({'alias':'乌珞琉斯（原文异写）','source':'《诡秘之主》第五部，第三十三章《生活的乐趣》'})
  entry['matchNote'] = '合计乌洛琉斯、原文异写乌珞琉斯和两个称号；连写及已核对的同处称谓去重，排除指威尔的“命运天使”和指物品命名的“吞尾者”。包含壁画、传闻等间接称呼。'
 if entry['id'] == 'elaine':
  entry['matchNote'] = '“伊莲”也曾被克莱恩用于伪装；字面次数没有区分本人、假扮者及其他同名用法。'
 if entry['id'] == 'tracy':
  entry['alias'] = '“疾病少女” / “疾病中将” / “疾病女王”'
  entry['aliasSources'].append({'alias':'疾病少女 / 疾病中将','source':'《诡秘之主》第二部，第七十九章《交流消息》、第八十一章《星之上将》'})
  entry['aliasSources'].append({'alias':'疾病女王','source':'《宿命之环》第四部，第二十一章《怪鱼》'})
  entry['matchNote'] = '统计特雷茜及三个时期的称号，紧邻姓名的称号合计一次。字面提及包含书名、传闻及梦境中的称呼。'
 if entry['id'] == 'katarina':
  entry['alias'] = '白之圣女 / 白之魔女'
  entry['aliasSources'].append({'alias':'白之圣女','source':'《诡秘之主》第五部，第八十三章《1号遗迹》'})
  entry['aliasSources'].append({'alias':'白之魔女','source':'《诡秘之主》第五部，第一百五十章《协作》'})
  entry['matchNote'] = '合计卡特琳娜、“白之圣女”和“白之魔女”；称号与姓名紧接连写计一次，包含梦境及被附身时的称呼。'
 if entry['id'] == 'bulatov_ivan':
  entry['alias'] = '“黄昏中将” / “黄昏之王”'
  entry['aliasSources'].append({'alias':'“黄昏中将” / “黄昏之王”','source':'《诡秘之主》第二部，第七十九章《交流消息》；《宿命之环》第五部，第四十四章《海盗之港》'})
  entry['matchNote'] = '统计布拉托夫及其先后使用的两个称号，紧邻姓名的称号合计一次。'
 if entry['id'] == 'ludwell':
  entry['alias'] = '“地狱上将”'
  entry['aliasSources'].append({'alias':'地狱上将','source':'《诡秘之主》第二部，第七十九章《交流消息》'})
  entry['matchNote'] = '合计路德维尔及“地狱上将”，称号紧邻姓名时计一次，含成为秘偶后对其身份的称呼。'
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
  entry['alias'] = '“时天使” / 莫尼特（分身） / 曾冒用忒尔弥波洛斯之名'
  entry['aliasSources'].append({'alias':'“时天使”','source':'《诡秘之主》第五部，第十五章《告知式提醒》'})
  entry['aliasSources'].append({'alias':'莫尼特（被寄生的分身）','source':'《宿命之环》第三部，第九十四章《莫尼特的真实身份》'})
  entry['matchNote'] = '统计“阿蒙”及《诡秘之主》第六部八章已核对的独立“时天使”称号；其余同称号、莫尼特及曾冒用的忒尔弥波洛斯等称呼尚未纳入。愚者教会的“时天使”亦可指帕列斯。'
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
  entry['matchNote'] = '合计姓名与带引号的“钢铁”，绰号紧接本名时计一次。包括身后他人提及其灵魂与非凡特性的段落。'
  entry['classificationEvidence'].append({'kind':'sequence','value':'活尸','source':'《诡秘之主》第三部，第四十六章《放牧》'})
 if entry['id'] == 'huntley_pirate':
  entry['matchNote'] = '合计亨特利与带引号的“血色荆棘”，绰号紧接本名时计一次。'
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
  entry['matchNote'] = '合计姓名，以及在第三部托付骰子、桥洞会面和解除厄运等章节中逐处确认指向他的议员称呼。称号与姓名连写时计一次。'
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

 if entry['id'] in tarot_aliases:
  title = tarot_aliases[entry['id']]
  if entry['id'] != 'xio':
   entry['matchNote'] = '统计姓名和已列出的别名，以及“'+title+'”紧接姓名或人物敬称的提及。连写计一次，单独牌名不计入。'
  entry['alias'] = entry['alias'].replace(title, '“' + title + '”')
  for evidence in entry['aliasSources']:
   if evidence['alias'] == title:
    evidence['alias'] = '“' + title + '”'
 if entry['id'] == 'audrey':
  entry['alias'] += ' / “傲慢”'
  entry['aliasSources'].append({'alias':'“傲慢”','source':'《诡秘之主》第七卷，第五十一章《“傲慢”》、第五十二章《七位委员》'})
 if entry['id'] == 'fors':
  entry['alias'] += ' / “星之天使” / “没有梦想的咸鱼”（梦境笔名）'
  entry['aliasSources'].append({'alias':'“星之天使”','source':'《宿命之环》第六部，第四十五章《电影》'})
  entry['aliasSources'].append({'alias':'“没有梦想的咸鱼”（梦境笔名）','source':'《宿命之环》第六部，第四十五章《电影》'})
  entry['matchNote'] = '统计佛尔思、梦境笔名“没有梦想的咸鱼”和明确的人物称呼，如“魔术师”女士。称号与本名连写计一次。单独的牌名、序列名及“星之天使”尚未计入。'
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
# Resolve established index identities before adding documents discovered on disk.
document_names = {
 'profile-康斯': '康斯',
 'ost': '奥斯塔', 'profile-康斯': '康斯',
 'ava': '阿娃·利齐耶', 'daley': '戴莉', 'pualis': '普阿利斯夫人',
 'trissy': '特里斯', 'bernadette': '贝尔纳黛·古斯塔夫',
 'nast': '纳斯特', 'glaint': '格莱林特子爵', 'ian': '伊恩·赖特', 'friend_april': '我有个朋友',
 'anderson': '安德森·胡德', 'zerel': '泽瑞尔', 'hazel': '海柔尔·马赫特',
 'anna_tingen': '安娜', 'edessak': '埃德萨克·奥古斯都', 'nilou': '妮露·雷蒙',
}
matched_paths = set()
def find_documents(entry):
 matches = profiles.get(document_names.get(entry['id'], entry['name']), [])
 return matches

for entry in out:
 for _, path, _ in find_documents(entry):
  matched_paths.add(path)

# The investigated identity has a directory page pending disambiguation.
separate_directory_records = {'杰森·贝利亚'}
mirror_ids = {'莫兰·阿维尼的镜中人':'morane_mirror', '镜中的加德纳·马丁':'gardner_mirror'}
for heading, documents in profiles.items():
 for _, path, frontmatter in documents:
  if path in matched_paths or path.stem in separate_directory_records or len(documents) != 1:
   continue
  counts = {book: text.count(heading) for book, text in texts}
  term, count_note = heading, '按档案姓名字面计数。'
  display_name = f'“{heading}”' if heading in {'孽龙','超星主宰','命运女神','衰败君王','高维俯视者','原初饥饿','不熄的呓语','宿命之环','不定之雾'} else heading
  if heading == '纪尧姆·贝里':
   terms = ['纪尧姆·贝里','纪尧姆.贝里','小纪尧姆','贝里家的纪尧姆']
   term = ' / '.join(terms)
   counts = {book:sum(text.count(name) for name in terms) for book,text in texts}
   count_note = '按全名、村中昵称及贝里家的纪尧姆计数。未限定身份的纪尧姆不计入。'
  if heading == '纪尧姆·利齐耶':
   shoe_names = re.compile(r'(?:鞋匠)?纪尧姆[·.]利齐耶|鞋匠纪尧姆|纪尧姆叔叔')
   term = '纪尧姆·利齐耶 / 鞋匠纪尧姆 / 纪尧姆叔叔'
   counts = {book:len(shoe_names.findall(text)) for book,text in texts}
   count_note = '合并全名、职业称呼和卢米安在鞋匠家中的称呼，连写的职业与全名计一次。'
  if heading == '阿泽玛·利齐耶':
   term = '阿泽玛'
   counts = {book:text.count(term) for book,text in texts}
   count_note = '合并全名（含两种分隔符）及单称阿泽玛，每处只计一次。'
  if heading == '鲁斯·巴托里':
   term = '鲁斯·巴托里 / 巴托里'
   counts = {'诡秘之主':sum(body.count('巴托里') for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按正文中的全名或单称巴托里计数，全名只计一次。月城狩猎队员鲁斯另计。'
  if heading in {'辛', '鲁斯（月城）'}:
   term = '辛' if heading == '辛' else '鲁斯'
   moon_chapters = {'第六部':{'第六十章','第六十一章','第六十二章','第六十三章','第六十四章','第六十五章','第六十七章','第六十八章','第六十九章'},
                    '第七卷':{'第三十三章','第六十章'}}
   appearances = re.compile('辛(?!苦)' if term == '辛' else '鲁斯')
   reviewed = sum(len(appearances.findall(body)) for volume, chapter, body in iter_chapters(*BOOKS[0][1:])
                  if chapter.split()[0] in moon_chapters.get(volume.split()[0], set()))
   counts = {'诡秘之主':reviewed,'宿命之环':0}
   count_note = '仅计入逐章核对的月城狩猎小队、迁居和弥撒段落中的人物称呼。'
  if heading in {'巴顿', '雅莉希亚·塔玛拉'}:
   counts = {'诡秘之主':sum(body.count(heading) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume == '番外'), '宿命之环':0}
   count_note = ('仅计番外《一个普通人的日常》中的巴顿，排除蒙巴顿等姓名。' if heading == '巴顿' else '仅计番外正文中的具名介绍，作者附记中的另一种结尾单独排除。')
  if heading in {'辛迪（红手套）','鲍勃（红手套）','波恩（月城）','威尔逊（毒刺帮）'}:
   term = heading.split('（')[0]
   if heading == '威尔逊（毒刺帮）':
    counts = {'诡秘之主':0,'宿命之环':sum(body.count(term) for volume, chapter, body in sequel_chapters() if volume.startswith('第二部'))}
    count_note = '仅计《宿命之环》第二部已核对的毒刺帮成员威尔逊，排除阿尔杰·威尔逊。'
   else:
    pattern = r'辛迪(?!斯)' if term == '辛迪' else re.escape(term)
    counts = {'诡秘之主':len(re.findall(pattern,dict(texts)['诡秘之主'])),'宿命之环':0}
    count_note = '按原文称呼逐章核对，括号是档案消歧标记。' + ('另排除辛迪斯马戏团。' if term == '辛迪' else '')
  if heading in {'阿古希德·尼根','格罗夫·奥古斯都'}:
   term = heading.split('·')[0]
   counts = {book:text.count(term) for book,text in texts}
   count_note = '按正文中可核对的名字计数，包含全名与单称；不单独统计可由他人担任的爵位或官职。'
  if heading in mirror_ids:
   morane = mirror_ids[heading] == 'morane_mirror'
   volume_name = '第四部' if morane else '第三部'
   chapters = {'第二百二十五章','第二百二十六章','第二百二十八章'} if morane else {'第二百二十三章','第二百二十四章','第二百二十五章','第二百二十六章','第二百二十七章'}
   pattern = re.compile('莫兰' if morane else '镜中的?加德纳')
   counts = {'宿命之环':sum(len(pattern.findall(body)) for volume, chapter, body in sequel_chapters()
                       if volume.startswith(volume_name) and chapter.startswith(tuple(chapters)))}
   term = '莫兰' if morane else '镜中加德纳 / 镜中的加德纳'
   count_note = ('仅计第四部第二百二十五、二百二十六、二百二十八章的姓名，含与莫兰本人重叠的提及。' if morane
                 else '仅计第三部第二百二十三至二百二十七章明确称为镜中加德纳或镜中的加德纳的提及。')
  if heading == '黄总（梦境都市）':
   name_pattern = re.compile('黄涛(?:黄总)?|黄总')
   reviewed = {'第二十六章','第五十章','第五十一章','第五十九章','第六十三章','第六十四章','第六十六章','第七十二章','第八十章','第八十一章','第八十三章'}
   counts = {'诡秘之主':0,'宿命之环':sum(len(name_pattern.findall(body)) for volume, chapter, body in sequel_chapters() if volume.startswith('第六部') and re.match(r'^第[^章]+章',chapter).group() in reviewed)}
   term = '黄涛 / 黄总（镜中人介入前后已核对的早期章节）'
   count_note = '截至第六部第八十三章，合并黄涛、黄总及连写形式。第二十一章关于大帝本名的讨论归入现实人物。后期身份混用的叙述暂不计入。'
  if heading == '镜中的罗塞尔':
   explicit = re.compile(r'镜中的?罗塞尔')
   in_farewell = re.compile(r'(?:黄涛模样的)?镜中的?罗塞尔|黄涛(?!黄总|的书房)')
   total = 0
   for volume, chapter, body in sequel_chapters():
    scene = volume.startswith('第六部') and chapter.startswith(('第一百三十八章','第一百三十九章','第一百四十章'))
    pattern = in_farewell if scene else explicit
    total += len(pattern.findall(body.split('第六部总结兼请假',1)[0]))
   counts = {'诡秘之主':0, '宿命之环':total}
   term = '镜中的罗塞尔 / 镜中罗塞尔 / 黄涛（书房会面与镜中告别）'
   count_note = '计入明称镜中人的段落及第六部第一百三十八至一百四十章以黄涛之貌现身的明确指代。面貌与称谓连写计一次；公司行程通报和书房归属未计入。'
  if heading in {'丹尼尔斯','“铁皮”'}:
   barrel = heading == '丹尼尔斯'
   title = re.compile(r'[“‘]水桶[”’](?:丹尼尔斯)?|丹尼尔斯' if barrel else r'[“‘]铁皮[”’](?!怀表)')
   counts = {'诡秘之主':len(title.findall(dict(texts)['诡秘之主'])), '宿命之环':0}
   term = '丹尼尔斯 / “水桶”' if barrel else heading
   count_note = '只计原文中可指认船员的姓名和绰号，连写计一次，排除物件名称。'
  if heading == '爱德华·斯蒂夫':
   chapters = {'第四十八章','第四十九章','第五十四章'}
   mentions = re.compile('爱德华(?:·斯蒂夫)?|斯蒂夫先生')
   counts = {'诡秘之主':sum(len(mentions.findall(body)) for volume, chapter, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第一部') and chapter.split()[0] in chapters), '宿命之环':0}
   term = '爱德华·斯蒂夫 / 爱德华 / 斯蒂夫先生'
   count_note = '仅计廷根占卜俱乐部三章中核对过的姓名与称呼，全名计一次。'
  if heading == '罗珊（梦境都市）':
   counts = {'诡秘之主':0, '宿命之环':rozanne_dream}
   term = '罗珊（梦境都市）'
   count_note = '统计《宿命之环》第六部正文对梦境人物的点名，区分了现实中同名者的资料、近况和卷末重访，排除作者卷末总结。'
  if heading == '梅森（巴纳摩港）':
   term = '梅森'
   counts = {'诡秘之主':0, '宿命之环':sum(body.count(term) for volume, _, body in sequel_chapters() if volume.startswith('第五部'))}
   count_note = '仅计第五部巴纳摩港冒险家的姓名。梅森咖啡馆与休的父亲梅森·迪尔分别处理。'
  if heading == '梅森·迪尔':
   counts = {'诡秘之主':sum(body.count(heading) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按章节正文计前任宫廷侍卫长全名，章标题不计入次数。'
  if heading == '瓦哈娜·海森':
   term = '瓦哈娜·海森 / 瓦哈娜'
   counts = {'诡秘之主':sum(body.count('瓦哈娜') for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '第四部授课、布料案及舞会八章中均以瓦哈娜称呼同一位礼仪教师，全名计一次。'
  if heading in FIRST_BOOK_NAMES:
   term = FIRST_BOOK_NAMES[heading]
   first_book_text = dict(texts)['诡秘之主']
   total = len(SCOTT_NAME_PATTERN.findall(first_book_text)) if heading == '斯卡特' else first_book_text.count(term)
   counts = {'诡秘之主': total, '宿命之环': 0}
   count_note = '按《诡秘之主》中核对过的本人称呼计数。' if heading != '斯卡特' else '按廷根住房公司职员斯卡特的姓名计数，排除地名托斯卡特。'
  if heading in SEQUEL_NAME_PATTERNS:
   pattern = SEQUEL_NAME_PATTERNS[heading]
   counts = {'诡秘之主': 0, '宿命之环': sum(len(pattern.findall(body)) for _, _, body in sequel_chapters())}
   count_note = '只计续作中的本人，排除其他姓名或相邻词语拼成的同字片段。'
  if heading == '罗迪':
   counts = {'诡秘之主':0, '宿命之环':sum(body.count('罗迪') for _, _, body in sequel_chapters())}
   count_note = '仅计法林港侍者，排除第一部作品中黑猫布罗迪的姓名。'
  if heading == '圣维耶芙':
   mentions = re.compile(r'圣维耶芙(?!教堂)')
   counts = {'诡秘之主':0, '宿命之环':sum(len(mentions.findall(body)) for _, _, body in sequel_chapters())}
   count_note = '按人名称呼、祷告和谈论画像时的姓名计数，排除以其命名的圣维耶芙教堂。'
  if heading == '汉密尔顿':
   # 第三部各处“白鲨”均指达米尔港的酒吧老板；续作另有白鲨街。
   pattern = re.compile(r'白鲨[”’]?(?:汉密尔顿)?|汉密尔顿')
   counts = {'诡秘之主':sum(len(pattern.findall(body)) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第三部')), '宿命之环':0}
   term = '汉密尔顿 / “白鲨”'
   count_note = '按第三部正文中的姓名和绰号统计，连写计一次。'
  if heading in {'所罗门','特伦索斯特'}:
   # Both names are also used for dynasties and artifacts. Count only the
   # ruler's title in the reviewed historical scenes, excluding other eras.
   title = '黑皇帝' if heading == '所罗门' else '夜皇'
   chapters = {'第二部':('第四章','第二百五十六章'), '第三部':('第二百一十五章',)}
   counts = {'诡秘之主':sum(body.count(title) for volume, chapter, body in iter_chapters(*BOOKS[0][1:])
                     if chapter.startswith(chapters.get(volume.split()[0], ()))), '宿命之环':0}
   term = title + '（四皇与血族历史回忆）'
   count_note = '仅统计第二部第四、二百五十六章和第三部第二百一十五章的皇帝称号。国名、家族名和封印物名不计。'
  if heading == '法布提':
   aliases = re.compile('法布提|拿波瑞狄斯利')
   counts = {book:len(aliases.findall(text)) for book, text in texts}
   term = '法布提 / 拿波瑞狄斯利'
   count_note = '合计古神本名和拿波瑞狄斯利之名的字面出现。分身借用其他身份时的称呼未计入。'
  if heading in {'哈里斯（白玛瑙号）','迪默多（白玛瑙号）','福克斯（班西港）','蒂格（布兰奇家保镖）'}:
   term = heading.split('（')[0]
   counts = {'诡秘之主':sum(body.count(term) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第三部')), '宿命之环':0}
   count_note = '按第三部白玛瑙号航行及班西港事件中的人名计数。' + ('排除“哈里斯刺剑”及续作中哈里森的异写。' if term == '哈里斯' else '')
  reviewed_volumes = {'莉迪亚（侦探助手）':'第二部','丹迪（原始月亮信徒）':'第三部','劳拉（原始月亮信徒）':'第三部','亚特鲁（卡罗曼之子）':'第二部','斯艾尔（莫尔斯镇教士）':'第一部','布拉亚（拜亚姆警督）':'第三部'}
  if heading in reviewed_volumes:
   term = heading.split('（')[0]
   volume_name = reviewed_volumes[heading]
   counts = {'诡秘之主':sum(body.count(term) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith(volume_name)), '宿命之环':0}
   count_note = f'按《诡秘之主》{volume_name}逐章核对的本人姓名计数。' + ('排除白银城人物达克·瑞金斯。' if term == '瑞金斯' else '')
  if heading in {'多丽丝（于尔根祖母）','布罗迪（黑猫）'}:
   term = heading.split('（')[0]
   counts = {'诡秘之主':sum(body.count(term) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按章节正文中的姓名统计，包含后文追忆，括注仅用于档案消歧。'
  if heading in {'丽芙（东区浆洗女工）','弗莱娅（黛西之姐）'}:
   term = heading.split('（')[0]
   counts = {'诡秘之主':sum(body.count(term) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按《诡秘之主》正文中的姓名逐章核对，包含回忆与黛西梦中所见，排除卷末作者总结。'
  if heading in {'伊莱特（诗人）','马伦（画家）','安永（评论家）'}:
   term = heading.split('（')[0]
   counts = {'诡秘之主':0,'宿命之环':sum(body.count(term) for volume, _, body in sequel_chapters() if volume.startswith('第三部'))}
   count_note = '按第三部正文中的姓名计数，含地下迷宫噩梦及事后回忆。' + ('排除第一部“卢米安永远”中的跨词匹配。' if term == '安永' else '')
  if heading == '洛克哈德·西亚卡姆':
   term = '洛克哈德 / 秘书（遇刺现场与问询）'
   scenes = {'第二百一十章','第二百一十一章','第二百一十二章','第二百一十四章'}
   counts = {'诡秘之主':sum(body.count('洛克哈德') + body.count('秘书')
           for volume, chapter, body in iter_chapters(*BOOKS[0][1:])
           if volume.startswith('第二部') and chapter.split()[0] in scenes), '宿命之环':0}
   count_note = '遇刺案四章中，姓名及简称共六处，指向本人的秘书称呼二十处。'
  if heading == '尼根公爵（帕拉斯的长子）':
   term = '尼根公爵（继位后）'
   counts = {'诡秘之主':negan_mentions['son'], '宿命之环':0}
   count_note = '按《管家》《战争的脚步》《玫歌庄园》《“潮水”》中指向继位长子的爵号统计。'
  if heading == '科塔尔':
   term = '科塔尔 / “乌黯魔狼” / “愿望之神”'
   counts = {'诡秘之主':0, '宿命之环':0}
   named_wolf = re.compile(r'(?:[“‘]?乌黯魔狼[”’]?)?科塔尔|乌黯魔狼')
   named_god = re.compile(r'(?:[“‘]?愿望之神[”’]?)?科塔尔')
   for volume, chapter, body in iter_chapters(*BOOKS[0][1:]):
    if volume.startswith('第六部') and chapter.split()[0] in {'第二十章','第二十一章'}:
     continue
    # Count the god title alone only in the hunt, where it denotes this angel.
    body = named_god.sub('科塔尔', body)
    counts['诡秘之主'] += len(named_wolf.findall(body))
    if volume.startswith('第六部') and chapter.split()[0] in {'第四十三章','第七十七章','第九十二章','第九十三章','第九十四章','第九十五章','第九十六章'}:
     counts['诡秘之主'] += body.count('愿望之神')
   count_note = '合计本名、指向本人的乌黯魔狼称呼及狩猎各章的愿望之神称呼。排除配方、一般性说明；连续称号与本名计一次。'
  if heading == '弗雷格拉':
   term = '弗雷格拉 / “毁灭魔狼” / “黑夜魔狼”'
   named_wolf = re.compile(r'(?:[“‘]?(?:毁灭魔狼|黑夜魔狼)[”’]?)?弗雷格拉|毁灭魔狼|黑夜魔狼')
   counts = {book:0 for book, _ in texts}
   for book, text_path, encoding in reference_texts():
    counts[book] += sum(len(named_wolf.findall(body)) for _, _, body in iter_chapters(text_path, encoding))
   count_note = '合计本名与两个称号，称号紧接姓名时计一次。含“霍纳奇斯……弗雷格拉”呓语中的重复呼名。'
  if heading == '孽龙':
   term = '“孽龙” / 孽龙'
   counts = {'诡秘之主':0, '宿命之环':sum(body.count('孽龙') for _, _, body in sequel_chapters())}
   count_note = '计第七、八部正文中的称呼，包括碑文与对封印的追述。单称“灾祸之城”的源质提及另行区分。'
  if heading == '伊鲁·爱德拉':
   term = '伊鲁（本人、遗物及疑似亡灵）'
   sailor = re.compile(r'伊鲁和萨拉的遗物|伊鲁病牙|伊鲁·爱德拉|伊鲁的模样|疑似伊鲁的|伊鲁看起来|真的伊鲁|伊鲁是不是|伊鲁和萨拉他们')
   counts = {'诡秘之主':0,'宿命之环':sum(len(sailor.findall(body)) for volume, _, body in sequel_chapters() if volume.startswith('第四部'))}
   count_note = '按米洛村水手的身份、遗物及疑似亡灵的上下文统计；船上假伊鲁的行为归于“吟游诗人”。'
  if heading == '费南德兹（走私者）':
   term = '费南德兹'
   counts = {'诡秘之主':0, '宿命之环':sum(body.count(term) for volume, _, body in sequel_chapters() if volume.startswith('第二部'))}
   count_note = '按第二部三个隧道调查章节计数，含呼唤和排除误认时提到的姓名。'
  if heading == '萨维尼·所罗门':
   term = '萨维尼'
   counts = {'诡秘之主':sum(body.count(term) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '合计罗塞尔日记中的全名和短名。纳斯特未具名地谈到父亲时另见关系出处。'
  if heading == '德维尔爵士':
   term = '德维尔 / 德维尔爵士'
   person = re.compile(r'(?<!路)德维尔(?!图书馆|信托公司|慈善基金|家族|家的一楼|家的纹章)')
   counts = {'诡秘之主':sum(len(person.findall(body)) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按姓名和爵号统计，排除路德维尔、家族纹章、房屋指称及以爵士命名的机构。'
  if heading == '克里斯（赛琳娜之兄）':
   term = '克里斯'
   scenes = {'第二十四章','第八十四章','第八十七章'}
   counts = {'诡秘之主':sum(body.count(term) for volume, chapter, body in iter_chapters(*BOOKS[0][1:])
           if volume.startswith('第一部') and chapter.split()[0] in scenes), '宿命之环':0}
   count_note = '仅计伍德家事务律师的姓名，排除康纳克里斯等其他人名中的片段。'
  if heading == '朱利安（萨默尔家女仆）':
   term = '朱利安'
   counts = {'诡秘之主':sum(body.count(term) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第二部')), '宿命之环':0}
   count_note = '仅计第二部萨默尔家女仆，简娜的哥哥另计。'
  if heading == '萨连特（伦堡旅客）':
   term = '萨连特'
   counts = {'诡秘之主':0, '宿命之环':sum(body.count(term) for volume, _, body in sequel_chapters() if volume.startswith('第五部'))}
   count_note = '按第五部伦堡列车与车站相遇的旅客计数，第三部同名店主另计。'
  if heading == '爱德华兹（罗塞尔的骑士）':
   term = '爱德华兹'
   knight = re.compile(r'(?<!·)爱德华兹(?!……这不是大帝)')
   counts = {'诡秘之主':sum(len(knight.findall(body)) for _, _, body in iter_chapters(*BOOKS[0][1:])), '宿命之环':0}
   count_note = '按日记、后人追忆与无名岛上的骑士形象计数，排除艾德雯娜的全名及克莱恩重复念出的姓氏。'
  if heading == '罗讷（议员秘书）':
   term = '罗讷'
   counts = {'诡秘之主':0, '宿命之环':sum(body.count(term) for volume, _, body in sequel_chapters() if volume.startswith('第二部'))}
   count_note = '按第二部议员办公室与化工厂调查各章中的姓名“罗讷”计数，括注用于档案消歧。'
  if heading == '路易斯（萨瓦党）':
   term = '路易斯'
   # Standalone mentions in volumes 2–3 concern the Savoyard except for
   # two explicit references to Lund and one discussion of the given name.
   savoyard = re.compile(r'(?<![·.])(?<!上一个)(?<!另一个)路易斯(?![·.]|和皮埃尔、纪尧姆一样常见)')
   counts = {'诡秘之主':0,'宿命之环':sum(len(savoyard.findall(body)) for volume, _, body in sequel_chapters() if volume.split()[0] in {'第二部','第三部'})}
   count_note = '按第二、三部逐章核对的单称计数，排除其他人物全名中的片段、对常见人名的泛指和指向管家隆德的回忆。'
  if heading == '贝拉':
   chapters = {'第七部': {'第四十二章','第四十三章'}, '第八部': {'第十一章','第六十四章'}}
   counts = {'诡秘之主':0,'宿命之环':sum(len(re.findall(r'(?<!弥)贝拉(?!科斯)', body)) for volume, chapter, body in sequel_chapters() if chapter.split()[0] in chapters.get(volume.split()[0], set()))}
   count_note = '仅计工厂指导、照顾朱利安及婚礼回顾中的贝拉，排除其他人名和街名。'
  if heading == '宿命之环':
   # The title of the second novel and the name of the entity coincide.
   divine_name = re.compile(r"“宿命之环”|‘宿命之环’|伟大的宿命之环'")
   counts = {book:0 for book, _ in texts}
   for book, path_to_text, encoding in reference_texts():
    counts[book] += sum(len(divine_name.findall(body)) for _, _, body in iter_chapters(path_to_text, encoding))
   count_note = '仅计章节正文中引号内的称号及第五部第一百三十一章引号不齐的呼称，排除同名书名。'
  if heading == '不熄的呓语':
   term = '不熄的呓语 / 不熄呓语'
   counts = {book:text.count('不熄的呓语') + text.count('不熄呓语') for book, text in texts}
   count_note = '合计同一称号的两种原文写法。'
  if heading == '拉里昂':
   names = re.compile(r'大牧首(?:拉里昂)?|(?<!希)拉里昂')
   counts = {'诡秘之主':sum(len(names.findall(body)) for volume, _, body in iter_chapters(*BOOKS[0][1:]) if volume.startswith('第七卷')), '宿命之环':0}
   term = '拉里昂 / 大牧首'
   count_note = '核对第七卷姓名与大牧首的称呼，职衔紧接本名计一次，排除希拉里昂。'
  if heading == '康斯':
   display_name = '康斯·李尔森'
   counts = {'诡秘之主':len(re.findall('康斯(?!顿|坦)',dict(texts)['诡秘之主'])),'宿命之环':0}
   count_note = '已排除康斯顿的地名及康斯坦丁等姓名，按《诡秘之主》中军情九处成员的称呼统计。'

  profile_id = mirror_ids.get(heading, 'profile-' + path.stem)
  document_names[profile_id] = heading
  out.append({
   'id': profile_id, 'name': display_name, 'short': heading, 'mark': heading[0],
   'alias': '', 'group': '宿命之环' if 'profile_work: "宿命之环"' in frontmatter else '其他人物',
   'counts': counts, 'mentions': sum(counts.values()), 'mentionTerm': term,
   'matchNote': count_note, 'aliasSources': [], 'classificationEvidence': [],
  })
  if heading == '瓦哈娜·海森':
   out[-1].update(short='瓦哈娜', alias='瓦哈娜', aliasSources=[{'alias':'瓦哈娜','source':'《诡秘之主》第四部，第十九章《鲁恩式含蓄》'}])
  if heading == '萨法莉':
   out[-1].update(alias='“12号房间”', aliasSources=[{'alias':'“12号房间”','source':'《宿命之环》第三部，第一百九十九章《关键的干扰》'}], matchNote='按姓名“萨法莉”计数。房间编号也指向地点或住客，未并入姓名次数。')
  if heading == '不熄的呓语':
   out[-1].update(alias='“不熄呓语”', aliasSources=[{'alias':'“不熄呓语”','source':'《宿命之环》第八部，第五十三章《易爆的恶意和欲望》'}])
  if heading == '孽龙':
   out[-1]['short'] = display_name
  if heading == '科塔尔':
   out[-1].update(alias='“乌黯魔狼” / “愿望之神”', aliasSources=[{'alias':'“愿望之神” / 乌黯魔狼科塔尔','source':'《诡秘之主》第六部，第九十二章《人类迷惑行为》'}])
  if heading == '弗雷格拉':
   out[-1].update(alias='“毁灭魔狼” / “黑夜魔狼”', aliasSources=[{'alias':'“毁灭魔狼” / “黑夜魔狼”','source':'《诡秘之主》第二部，第一百章《古老的神灵》'}])
  if heading == '丹尼尔斯':
   out[-1].update(alias='“水桶”', aliasSources=[{'alias':'“水桶”','source':'《诡秘之主》第三部，第二百零八章《信使小姐》'}])
  if heading == '法布提':
   out[-1]['alias'] = '恶魔君王 / 拿波瑞狄斯利'
   out[-1]['aliasSources'].append({'alias':'拿波瑞狄斯利','source':'《宿命之环》第八部，第二十七章《报酬》'})
  if heading == '莫兰·阿维尼的镜中人':
   out[-1].update(short='莫兰（镜中人）', alias='冒用莫兰身份的镜中人',
                  progression=[{'pathway':'仲裁人','sequence':'序列5“惩戒骑士”','source':'《宿命之环》第四部，第二百二十六章《强破替身》、第二百三十二章《到来》','note':'冒用部长身份期间的序列。'}],
                  classificationEvidence=[{'kind':'pathway','value':'审判者','source':'《宿命之环》第四部，第二百二十六章《强破替身》','note':'镜中人被称为惩戒骑士。'}])
  if heading == '镜中的加德纳·马丁':
   out[-1].update(short='加德纳（镜中）', mark='加', alias='镜中人 / 假马丁')
  if heading == '黄总（梦境都市）':
   out[-1]['alias'] = '黄涛 / 黄总'
   out[-1]['aliasSources'].append({'alias':'黄涛 / 黄总','source':'《宿命之环》第六部，第五十章《守护者》'})
  if heading == '镜中的罗塞尔':
   out[-1]['alias'] = '镜中罗塞尔 / 镜中的罗塞尔·古斯塔夫'
   out[-1]['aliasSources'].append({'alias':'镜中罗塞尔 / 镜中的罗塞尔·古斯塔夫','source':'《宿命之环》第四部，第二百三十章《镜中世界第三层》、第二百三十一章《命运片段》'})
  if heading == '汉密尔顿':
   out[-1]['alias'] = '“白鲨”'
   out[-1]['aliasSources'].append({'alias':'“白鲨”','source':'《诡秘之主》第三部，第十七章《招揽》、第十八章《审问“白鲨”》'})
  matched_paths.add(path)

for entry in out:
 progression = progressions.get(entry['id'])
 if progression:
  entry['progression'] = progression
 entry['classificationEvidence'] = [fact for fact in entry.get('classificationEvidence', []) if fact.get('kind') not in {'organization', 'nationality'}]
 matches = find_documents(entry)
 if len(matches) == 1:
  body, document_path, frontmatter = matches[0]
  alias_source = re.search(r'^profile_alias_source: "(.+)"$', frontmatter, re.M)
  if alias_source:
   alias = re.search(r'^profile_alias: "(.+)"$', frontmatter, re.M)
   if not alias:
    raise ValueError(f'别名出处缺少对应名称：{document_path}')
   aliases = [item for item in entry.get('alias', '').split(' / ') if item]
   if alias[1] not in aliases:
    entry['alias'] = ' / '.join([*aliases, alias[1]])
   entry.setdefault('aliasSources', []).append({'alias': alias[1], 'source': alias_source[1]})
  fields = re.findall(r'^- ((?:国籍(?:／身份)?|所属组织|(?:其他|后续)组织经历|姓名)：[^\n]+)', body, re.M)
  if fields:
   entry['documentProfile'] = fields
  period_notes = re.findall(r'^- 原文所见：(.+)$', body, re.M)
  if re.search(r'^ordinary_in_cited_period: true$', frontmatter, re.M):
   if not period_notes:
    raise ValueError(f'普通人时期缺少原文说明: {document_path}')
   entry['ordinaryInCitedPeriod'] = True
  if period_notes:
   entry['pathwayPeriodNotes'] = period_notes
  entry['documentProfileUrl'] = '../characters/entries/' + quote(document_path.stem, safe='') + '/'
  # Empty or missing categories mean that grouping has not been verified.
  association = re.search(r'^sefirah_association: (.+)$', frontmatter, re.M)
  if association:
   sefirah = json.loads(association[1])
   for pathway in sefirah['pathways']:
    entry['classificationEvidence'].append({
     'kind': 'pathway', 'value': pathway, 'relation': 'sefirah',
     'source': sefirah['source'], 'note': sefirah['name'] + '：' + sefirah['note']
    })
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
     if kind == 'organization' and (
      fact['value'] in {'恩马特号', '特里尔警察', '马塔尼邦巡查队'}
      or any(term in fact['value'] for term in ('办公室', '办公楼', '办事处', '宅邸', '探索队', '巡逻小队', '审判所', '裁判所', '联合调查组'))
     ):
      raise ValueError(f'任职地点或下属单位不能单列为组织: {document_path}: {fact["value"]}')
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
build_directory(out)
output=root/'source/relationships/character-index.js'
output.write_text('// 由 tools/build-character-index.py 生成；提及数是字面匹配，并非消歧后的完整人数。\nconst indexedCharacters = '+json.dumps(out,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'已生成 {len(out)} 位候选人物')
