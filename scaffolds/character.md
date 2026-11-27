---
# 人物正文、时期限定和成员来源见 docs/来源标注规范.md；建档门槛见 AGENTS.md。
title: {{ title }}
layout: index
character_profile: true
character_record_tables: true
# entry_id 使用唯一且稳定的标识；新增前检查现有别名与提及门槛。
# 只维护正式人物页；改名、合并或删节时更新站内引用，不创建旧地址别名页、跳转或兼容锚点。
entry_id:
entry_type: character
# graph_profile 保存图谱名称、简称、别名、途径依据和晋升阶段；组织与国籍只填 graph_classifications。
graph_profile: {"short": "", "mark": "", "alias": "", "group": "其他人物", "classificationEvidence": [], "progression": []}
# 关系统一维护于 source/_data/relations.json，以双方 entry_id 引用；人物关系区按“角色、关系名称、一句话描述”读取同一条记录；不要在此手填关系表。
# 基本资料用标签和值；晋升、关系和历史记录沿用共享正文表格，列宽随内容分配。
# 桌面左侧连续正文、右侧基本资料表，窄屏资料表置于导语下。化名、席位、信仰身份和外界称谓按各自适用时期归类。
# 基本资料只填简短属性；正文补充依据和经历，不再重复属性表。经历按人物人生顺序整合为少量阶段，不按来源发现顺序追加事件标题。
# 办公地点、普通雇主和学校写入人物履历。组织分类用于有章节依据的团体归属。
# 原文能确认角色独立且没有组织归属时，可在 organization 中填写 value 为“独立”的条目，并注明章节依据和适用时期。资料不足时保留空数组。
graph_classifications: {"organization": [], "nationality": []}
permalink: characters/entries/{{ title }}/
# 作品归属只在这里维护；不再重复填写 profile_facts 的“所属作品”。
# title 为正式名称；别名维护于 graph_profile.alias 及现有依据，不另写 document_name/profile_alias 副本。
# 信息栏优先使用现有结构化显示或 source_section；短属性直接从对应正文生成，过长记录跳转小节，不复制 summary。
# progression 为晋升阶段主源；图谱简介从正文及其出处生成，不填写 documentProfile/documentExcerpt。
profile_work: 待补充
profile_facts:
  - label: 途径与序列
  - label: 国籍／身份
    source_section: 身份与称号
  - label: 所属组织
  - label: 首次登场
    value: 待核实
# 待补充：概述人物身份、主要经历及其在故事中的地位，并标注原文出处。
# 区分籍贯、居住地与国籍。关系与晋升阶段注明时期、依据和出处。
---

<!-- 首段直接介绍人物和关键身份。只保留有资料的小节；简短的外貌、国籍等属性可并入导语或身份段。 -->

## 身份与称号

<!-- 多重身份按“名称、身份或活动时期”编排；姓名、称号、组织职务应能区分。 -->

<!-- 非凡途径与晋升由共享模板直接展开 graph_profile.progression，不再手填同名正文小节；同期权柄另列，正文只写独立经历。 -->

## 尊名

<!-- 按指向的身份或时期标明尊名，保留原有语序和分行；完整尊名放在生平之前。 -->

## 生平经历

<!-- 按人生先后分成少量阶段；短档案可直接用一段叙述。相关词条、人物关系、来源依次由共享视图展示，关系区设计见 docs/来源标注规范.md。 -->
