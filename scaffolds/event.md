---
# 正文直接陈述事实；不复述核验过程，不列通用缺失字段清单。推定、传闻、自述、计划、个体特例及适用时期用最短且准确的限定保留；能力危险与使用条件不得删去。
# 单一事实源以事实为单位，不因展示需要重复填表；新增视图复用主源，旧字段未迁移前保留现有读取契约。
# event_work 只填写一次；narrative_order.work 使用 YAML 锚点复用，解析后仍提供现有读取器要求的两个字段。
# event_summary 为阅读概括，正文只扩展细节；日历短名仅在标题不适合展示时填写，不新增第三份事件经过。
# 分类双链由共享构建索引生成；正文使用正式站内链接，不手填反向关联清单。来源与导航不参与关联。
# 引用规范：遵循 docs/来源标注规范.md；完整出处集中列一次，注明小节或阶段范围，推定与例外紧贴事实。
# event_source 与 event_time_source 分别维护事实和时间依据；同源也保留两个字段，模板合并显示，正文不重复完整出处。
# 数据架构：新建前阅读 docs/词条数据与多视图架构.md；事实只维护一个来源，复用共享模板。
# 简记与时间推定：阅读 docs/简单事件与时间推定规范.md；主动核查前后时间锚点，不把年月未知等同于日号未知。
# 新字段须配套读取器；构建从词条生成视图，不手改生成数据。
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
# 日期在页首简短显示；完整时间推导和来源默认收起，正文来源延迟悬停显示。
# 独立跨日事件沿主轴顺排；确有同期事件时显示右侧区间。首末日内经核实发生在区间中的单日事件可填 event_time_during 引用该区间 ID。
# 跨日持续区间须区别于单次事件的可能发生窗口，不能根据两个日期自动认定始终持续。
---

## 事件经过
