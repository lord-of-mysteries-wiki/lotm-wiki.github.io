#!/usr/bin/env python3
"""Build a conservative character index from one copy of each novel."""
import json,re
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
candidates.extend([('mahti_mori','莫里·马赫特','马赫特议员','','其他人物'),('mountbatten','比奇·蒙巴顿','蒙巴顿','','其他人物'),('byers','拜尔斯','拜尔斯','','其他人物'),('luka','卢卡','卢卡','','其他人物'),('jasmin','贾斯敏','贾斯敏','','其他人物'),('nikira','尼基拉','尼基拉','','宿命之环'),('xu_xinyang','徐新阳','徐新阳','','宿命之环'),('madame_michel','米歇尔太太','米歇尔太太','','宿命之环'),('ruhr','鲁尔','鲁尔','','宿命之环'),('bram','布拉姆·安德雷拉德','布拉姆','','宿命之环')])
candidates.extend([('antigonus','安提哥努斯','安提哥努斯','','其他人物'),('zarathustra','查拉图斯特拉','查拉图斯特拉','','宿命之环')])
candidates.extend([('vijaypan','维杰潘','维杰潘','','宿命之环'),('les_morora','列斯','列斯','','宿命之环'),('kemolo','克墨洛','克墨洛','','宿命之环'),('vanak','瓦纳克','瓦纳克','','宿命之环'),('griffith','格里菲斯','格里菲斯','','宿命之环'),('robert_south','罗伯特','罗伯特','','宿命之环')])
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
# Alternate identities of Klein are not separate people.
candidates=[x for x in candidates if x[0] not in ('gehrman','sherlock','celia')]
# 伊康瑟属于蒸汽教会的机械之心，不属于黑夜教会的值夜者。
candidates=[(*x[:4], '其他人物') if x[0]=='ikance' else x for x in candidates]
texts=[(name,path.read_text(encoding=enc,errors='replace')) for name,path,enc in books]
out=[]
for ident,name,short,exact,group in candidates:
 terms={'patrick_bryan':['帕特里克·布雷恩','帕特里克·布莱恩'], 'cattleya':['嘉德丽雅','星之上将','星之女王'], 'bernadette':['贝尔纳黛','神秘女王'], 'amanises':['阿曼妮西斯','黑夜女神'], 'roselle':['罗塞尔','黄涛'], 'lumian':['卢米安','路易·贝里','夏尔·杜布瓦'], 'trissy':['特莉丝','特里斯'], 'pierre':['皮埃尔·贝里'], 'gardner':['加德纳'], 'pons':['蓬斯'], 'charlie':['查理'], 'rato':['拉托'], 'voisin':['瓦赞'], 'hugues_correct':['于格·阿图瓦'], 'klein':['克莱恩','周明瑞','格尔曼·斯帕罗','格尔曼','夏洛克·莫里亚蒂','夏洛克','道恩·唐泰斯','道恩·唐泰斯','梅林·赫尔墨斯']}.get(ident,[exact or short])
 if ident == 'louis_wien':
  terms.append('X先生')
 if ident == 'sasrir':
  terms.extend(['暗天使','萨斯列尔'])
 if ident == 'alista':
  terms.append('血皇帝')
 if ident in {'edwina','senor','qilangos'}:
  terms.append({'edwina':'冰山中将','senor':'血之上将','qilangos':'飓风中将'}[ident])
 if ident == 'franca':
  terms.append('查内姆')
 if ident == 'bernadette':
  terms.append('黄贝贝')
 if ident == 'jenna':
  terms.append('切莉娅')
 if ident == 'mahti_mori':
  terms.append('莫里·马赫特')
 if ident == 'antigonus':
  terms.append('安小天')
 if ident == 'frank':
  terms.append('李克己')
 if ident == 'lumian':
  terms.append('李明')
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
 terms=sorted(set(terms),key=len,reverse=True)
 pattern=re.compile('|'.join(map(re.escape,terms)))
 # 莱恩 is also a substring of 克莱恩; those hits do not identify Ryan.
 if ident == 'ryan':
  pattern=re.compile(r'(?<!克)莱恩')
 elif ident == 'roselle':
  pattern=re.compile(r'(?<!格)罗塞尔|黄涛')
 elif ident == 'canos':
  pattern=re.compile(r'(?<!托斯)卡诺')
 elif ident == 'les_morora':
  pattern=re.compile(r'(?<!帕)列斯')
 elif ident == 'guillaume':
  pattern=re.compile(r'纪尧姆(?![·.]利齐耶|[·.]皮埃尔)')
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
  pattern=re.compile(r'查拉图(?!斯特拉)')
 elif ident == 'antigonus':
  pattern=re.compile(r'安提哥努斯(?!家族|笔记)|安小天')
 elif ident in {'edwina','senor','qilangos'}:
  title={'edwina':'冰山中将','senor':'血之上将','qilangos':'飓风中将'}[ident]
  pattern=re.compile(r'(?:[“]?'+title+r'[”]?[，,、\s]*)?'+short+r'|'+title)
 elif ident == 'alista':
  pattern=re.compile(r'(?:[“]?血皇帝[”]?[，,、\s]*)?亚利斯塔(?:[·.]图铎)?|血皇帝')
 elif ident == 'sasrir':
  pattern=re.compile(r'(?:[“]?暗天使[”]?[，,、\s]*)?(?:萨斯利尔|萨斯列尔)|暗天使')
 elif ident == 'friend_april':
  pattern=re.compile(r'(?<=“)(我有个朋友)(?=”)')
 elif ident in {'professor','associate_professor','condensed_matter','periodic_table','isotope','lady_moon','underworld_taoist'}:
  pattern=re.compile(r'(?<=“)' + re.escape(short) + r'(?=”)')
 term=' / '.join(terms)
 counts={book:sum(1 for _ in pattern.finditer(text)) for book,text in texts}
 if ident in {'morane','roche_louise','class_kitz','snalna','travis','ailos','delilah','vermond_sauron','niol','fernandez','ivilista','basil_pirate'}:
  counts['诡秘之主']=0
 if ident in {'urdi','galis','windsor','okfa','louis_wien','ernest','donna_branch','denton_branch','cleves','cecil_guard','hood_eugen','william_sykes','ael_moria','bird_mustan','mary_short','drag_gail','erica_taylor','luke_summer','hibbert_hall','sindras','carlon','jodson','blight','foulet_ken'}:
  counts['宿命之环']=0
 if ident in {'gusin','gabriel','fidel','bainfel','rubio','rayasa','maislo','julien_jenna','perle','nikira','xu_xinyang','madame_michel','ruhr','bram','vijaypan','les_morora','kemolo','vanak','griffith','robert_south','brown_sauron','pedro_captain','hisoka','mad_lady','bard_april','agent_007','friend_april','gandalf','professor','associate_professor','condensed_matter','periodic_table','isotope','lady_moon','underworld_taoist'}:
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
match_notes = {'true_creator':'“真实造物主”在不同阶段与亚当存在复杂身份关系；此处单列称号以保留融合前后的叙述。', 'ancient_sun':'仅统计“远古太阳神”字面写法；“造物主”等称号可能指不同存在，尚未直接合并。', 'david_raymond':'统计“戴维”的字面出现，可能包含同名人物；完整姓名出现十次。', 'patrick_bryan':'合计完整姓名的“布雷恩”和“布莱恩”两种写法；与帕特里克·杰森分别计数。', 'cattleya':'包含“嘉德丽雅”“星之上将”“星之女王”的字面匹配；代号“隐者”暂未计入。', 'bernadette':'包含“贝尔纳黛”和“神秘女王”的字面匹配；仍需结合语境核对。', 'soest':'排除了“特伦索斯特”中的命中；其他同名用法仍需核对。', 'goodwill':'排除紧随“化工厂”的命中；仅写姓氏时可能指家族或其他人。', 'groselle':'排除了《格罗塞尔游记》书名的直接命中，其余字面结果仍需消歧。', 'hermes':'排除了明显的“古赫密斯”、赫密斯语及赫密斯文命中；其余字面结果仍可能指文字或语言。', 'ormir':'排除了“奥尔米尔葡萄酒”的命中；其他同名用法仍需人工核查。', 'lilith':'只统计“莉莉丝”，不将有其他历史身份的大地母神或欧弥贝拉字面命中直接算入。', 'medici':'排除了完整写作“阿不思·梅迪奇”及“梅迪奇家族”的命中；其他仅写姓氏的语境仍有歧义。', 'termiboros':'该名字既指真正的忒尔弥波洛斯，也曾被阿蒙冒用；字面次数未区分两者。', 'amon':'阿蒙曾冒用忒尔弥波洛斯的名字，相关歧义称呼未计入阿蒙的字面次数。', 'amanises':'包含“阿曼妮西斯”和“黑夜女神”的字面匹配；其他称号尚未计入。', 'roselle':'包含“罗塞尔”和“黄涛”的字面匹配，梦境形象等语境仍需人工区分。', 'ryan':'排除了“克莱恩”中的相同字串，仅统计《宿命之环》。', 'guillaume':'排除了明确写作纪尧姆·利齐耶和纪尧姆·皮埃尔的命中；单独的纪尧姆仍可能有歧义。', 'frye':'排除了“弗莱娅”和“汉弗莱”中的命中；仍可能有其他同名。', 'lumian':'含“卢米安”“路易·贝里”和“夏尔·杜布瓦”；单独的“夏尔”有歧义，尚未计入。'}
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
 ('sharron','怨魂','《诡秘之主》第二部，第一百一十八章《被诅咒者》'),
 ('maric','囚犯','《宿命之环》第五部，第三十八章《哭喊声》'),
 ('anthony','心理医生','《宿命之环》第二部，第一百五十章《震慑》'),
 ('anderson','收割者','《诡秘之主》第三部，第一百七十一章《脸黑手黑》'),
 ('colin','猎魔者','《诡秘之主》第二部，第一百四十八章《半透明的小虫》'),
 ('lovia','牧羊人','《诡秘之主》第一部，第二百零二章《确认情况》'),
 ('trissy','教唆者','《诡秘之主》第一部，第一百二十五章《大胆的想法》'),
]:
 classification_evidence.setdefault(ident, []).append({'kind':'sequence','value':value,'source':source})
classification_evidence.setdefault('gardner', []).append({
 'kind':'pathway','value':'红祭司','certainty':'inferred',
 'source':'《宿命之环》第二部，第一百三十二章《不屈》',
 'note':'芙兰卡判断他属于猎人途径，具体序列仍不确定。'
})
classification_evidence.setdefault('bernadette', []).append({
 'kind':'pathway','value':'隐者','certainty':'inferred',
 'source':'《诡秘之主》第三部，第一百八十七章《交换情报》',
 'note':'克莱恩根据她的经历和能力推断属于窥秘人途径；此处保留推测性质。'
})
# Explicit nationality descriptions in the cited chapters; do not infer from residence.
for ident, source in {
 'lumian':'《宿命之环》第二部，第七十章《大餐》',
 'jenna':'《宿命之环》第三部，第四十三章《矛盾感》',
 'danitz':'《宿命之环》第三部，第二十八章《大人物》',
}.items():
 classification_evidence.setdefault(ident, []).append({'kind':'nationality','value':'因蒂斯','source':source})
for entry in out:
 entry['matchNote'] = match_notes.get(entry['id'], '')
 entry['aliasSources'] = identity_sources.get(entry['id'], [])
 entry['classificationEvidence'] = classification_evidence.get(entry['id'], [])
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
  entry['alias'] = '西索'
  entry['aliasSources'].append({'alias':'西索','source':'《宿命之环》第四部，第一百五十四章《团队合作》'})
  entry['matchNote'] = '合计“西索”和“特瓦纳科”的字面匹配；代号及姓名的其他同名用法仍需核查。'
 if entry['id'] == 'morane':
  entry['matchNote'] = '统计“莫兰”的字面匹配；原人物与冒用其身份的镜中人未按每次提及区分。'
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
  entry['alias'] = '芙兰卡·罗兰 / 红靴子 / 查内姆'
  entry['aliasSources'].append({'alias':'芙兰卡·罗兰','source':'《宿命之环》第三部，第一百三十五章《人血面包》'})
  entry['aliasSources'].append({'alias':'红靴子','source':'《宿命之环》第二部，第六十五章《奖赏》'})
  entry['aliasSources'].append({'alias':'查内姆','source':'《宿命之环》第四部，第七十一章《可能的突破口》；第八十二章《“宫殿”》'})
 if entry['id'] == 'green_dream':
  entry['matchNote'] = '“格林”字面匹配可能包括其他人名或地名；《宿命之环》中主要出现的是罗塞尔追随者格林的梦境形象。'
 if entry['id'] == 'jiangyue_dream':
  entry['matchNote'] = '江月出现在梦境都市，不能据此认定现实中存在对应人物。'
 if entry['id'] == 'charlie':
  entry['matchNote'] = '“查理”的字面统计可能包含其他同名人物，例如科尔杜村行政官的男仆；尚未逐处消歧。'
 if entry['id'] == 'wendell':
  entry['matchNote'] = '排除了“文德尔街”的字面命中；其他同名用法仍需核查。'
 if entry['id'] == 'bernadette':
  entry['alias'] += ' / 黄贝贝（梦境称呼）'
  entry['aliasSources'].append({'alias':'黄贝贝（梦境称呼）','source':'《宿命之环》第六部，第二十一章《初来乍到》'})
  entry['matchNote'] = '包含“贝尔纳黛”“神秘女王”和梦境称呼“黄贝贝”的字面匹配，梦境与现实情节需区分。'
 if entry['id'] == 'jenna':
  entry['alias'] = '切莉娅·贝洛 / 切莉娅 / 浮夸女'
  entry['aliasSources'].append({'alias':'切莉娅·贝洛（真名）','source':'《宿命之环》第二部，第一百三十章《灭火》'})
  entry['aliasSources'].append({'alias':'浮夸女','source':'《宿命之环》第二部，第五十三章《新鲜的尸体》'})
  entry['matchNote'] = '合并“简娜”和“切莉娅”的字面匹配；“浮夸女”尚未计入，其他同名用法仍需核查。'
 if entry['id'] == 'julien_jenna':
  entry['matchNote'] = '只统计《宿命之环》中的“朱利安”；《诡秘之主》中有同名的萨默尔家女仆。其他同名用法仍需核查。'
 if entry['id'] == 'patrick':
  entry['matchNote'] = '该名称涉及人皮伪装与误导；调查者一度将其与“欲望使徒”混为一人，后续揭示是两个人。字面次数没有区分使用者。'
 if entry['id'] == 'jason':
  entry['matchNote'] = '该名称涉及人皮伪装与误导；调查者一度将其与帕特里克·杰森混为一人，后续揭示是两个人。字面次数没有区分使用者。'
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
  entry['alias'] = '李克己（梦境形象）'
  entry['aliasSources'].append({'alias':'李克己（对应梦境形象）','source':'《宿命之环》第六部，第七十六章《精神病科》'})
  entry['matchNote'] = '包含“弗兰克”和其梦境形象“李克己”的字面匹配；“弗兰克”可能有其他同名用法。'
 if entry['id'] == 'lumian':
  entry['alias'] += ' / 李明（梦境假名）'
  entry['aliasSources'].append({'alias':'李明（梦境假名）','source':'《宿命之环》第六部，第三十六章《宛若真实》'})
  entry['matchNote'] = '含“卢米安”“路易·贝里”“夏尔·杜布瓦”和梦境假名“李明”；单独的“夏尔”有歧义，尚未计入。'
 if entry['id'] == 'zarath':
  entry['matchNote'] = '排除“查拉图斯特拉”中的字面命中；其他家族和同名语境仍需消歧。'
 if entry['id'] == 'zarathustra':
  entry['matchNote'] = '主要记录梦境都市中的查拉图斯特拉；与其他同名或相似称呼的身份关系须逐章核对。'
 if entry['id'] == 'nikira':
  entry['matchNote'] = '尼基拉的身份曾被镜中人格里菲斯替换，字面次数没有区分本人及冒名者。'
 if entry['id'] == 'griffith':
  entry['alias'] = '曾替换尼基拉'
  entry['aliasSources'].append({'alias':'曾替换尼基拉','source':'《宿命之环》第五部，第八十六章《痴迷》'})
  entry['matchNote'] = '仅统计“格里菲斯”字面写法；替换尼基拉后的歧义称呼未计入。'
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
  entry['alias'] = '咸蛋超人'
  entry['aliasSources'].append({'alias':'咸蛋超人','source':'《宿命之环》第四部，第八十六章《窃取》'})
  entry['matchNote'] = '包含“拉托”和“咸蛋超人”的字面匹配；短名的其他同名用法仍需核查。'
 if entry['id'] == 'maric':
  entry['alias'] = '宝剑骑士'
  entry['aliasSources'].append({'alias':'宝剑骑士','source':'《宿命之环》第五部，第三十七章《诅咒》'})
  entry['matchNote'] = '包含“马里奇”和“宝剑骑士”的字面匹配；后者也可能指牌本身，次数尚未消歧。'
 if entry['id'] == 'clarisse':
  entry['alias'] = '黑之魔女'
  entry['aliasSources'].append({'alias':'黑之魔女','source':'《宿命之环》第三部，第一百九十一章《隐秘的尊名》'})
  entry['matchNote'] = '包含“克拉丽丝”和“黑之魔女”的字面匹配；其他同名用法仍需核查。'
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
