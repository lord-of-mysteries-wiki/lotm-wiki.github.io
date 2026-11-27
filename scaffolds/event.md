---
# 简记、详情与时间推定见 docs/简单事件与时间推定规范.md；事实和时间的出处见 docs/来源标注规范.md。
title: {{ title }}
layout: index
timeline_event: true
# entry_id 与 narrative_order.position 必须唯一；position 是原文顺序，可在相邻值之间插入小数。
entry_id:
entry_type: event
# 修改作品时只改锚点定义，不能再为 narrative_order.work 手写第二份值。
event_work: &event_work "诡秘之主"
# work 须与 event_work 相同；volume、label 保存原文目录文案，不猜造章节或日期。
narrative_order: {work: *event_work, volume: "", position: null, label: ""}
# 展示类型与概括独立：brief 为简记，detail 为详细事件；会议和经过较复杂的跨章节战斗使用 detail。
# 塔罗会标题用“塔罗会成立”“塔罗会例会”或“塔罗会临时会议”，议题写入概括。
event_display: detail
# 两种类型都须填写概括与事实出处；完整时间推导单独保存在 event_time_basis/source。
event_summary: ""
# 可选日历事件名：采用能准确指代整件事的原文章节标题，或概括为一个简短事件名称。
# 不要求是 title/event_summary 的连续子串；建议6—16字，最多24字，不写长句、重复日期或考据。
# 章节标题须与本事件对应且可核对；“故事”“深夜”“来访者”等不明确的标题改用具体事件名。
# 跨日事件只命名一次，阶段不另建日历事件；未填写时删除此字段，回退为正式标题。
# event_calendar_label: ""
event_source: ""
# 概括中的已核实词条链接；target 为站内生成路径，时间线、详情与日历展开内容共用。
event_summary_links: []
# 完整日期按故事内纪年填写（YYYY-MM-DD），可据文档线索推定并记录依据；日号不明时填写年月字段。
event_time: ""
# 第一至第四纪可填写 event_era: 1–4，并用 event_time_note 记载有依据的纪内阶段。
# 这类事件不填写第五纪年月日字段。
# event_era: 2
# 确定纪内相对顺序时可填写 event_era_order，并在 event_time_basis 说明依据。
# event_era_order: 10
# 范围终点：仅在可核实边界时填写。
event_time_end: ""
# 已核实的跨日范围可选：staged 为分阶段（虚线），continuous 为持续行动（实线）。
# 单次事件的可能发生窗口不填写此字段；跨日整体仍只对应一个事件 ID。
# event_range_kind: staged
# anchor：事件中的单日锚点；range：日期范围；partial：只有月份、季节等局部线索。
event_time_precision: ""
# partial 的年份或年月（YYYY / YYYY-MM），须有适用于本事件的依据。
event_time_period: ""
# 已知晚于同月有完整日期的事件时，可用 event_time_after 引用其 entry_id。
# 可选年月范围终点，与起点精度一致，不代表事件连续发生。
event_time_period_end: ""
# stated：原文明确；inferred：由原文线索推算。局部线索可留空。
event_time_certainty: ""
# 仅当所展示的日期或范围有矛盾或存疑时启用，并在 event_time_basis 说明原因。
# event_time_uncertain: true
# 可选精度限定，如“年底”，需有时间依据；可能发生窗口可设置 event_time_window: true，须有年月范围。
# 仅填写时间词。地点、行动和相对顺序的说明写入时间依据。
event_time_qualifier: ""
event_time_window: false
# 记录推理过程、适用范围、未确认部分及原文章节。
event_time_basis: ""
event_time_note: ""
# 来源格式：作品名、卷号和章节号，例如《诡秘之主》第一卷第9章；不写章节标题。
event_time_source: ""
# 详情页可指定固定网址；简记使用时间线锚点。
permalink: ""
# 待补充：事件内容、涉及人物及来源。
# 待核实：故事内日期或范围、推断过程和原文章节。
# 正文只维护详细经过；有阶段时按实际日期分节，不为不同视图复制事件或事实。
# 概括、出处和时间依据由共享模板读取以上字段，不在正文重复维护同名区块。
# 日期在页首简短显示；时间推导可展开查看，来源在页末直接显示，正文来源延迟悬停显示。
# 独立跨日事件沿主轴顺排；确有同期事件时显示右侧区间。首末日内经核实发生在区间中的单日事件可填 event_time_during 引用该区间 ID。
# 跨日持续区间须区别于单次事件的可能发生窗口，不能根据两个日期自动认定始终持续。
---

## 事件经过
