# 组件规范 Components

> 引用令牌见 [tokens.md](./tokens.md)。每个组件给出：用途 / 结构 / 变体 / 状态 / 规则。
> 命名即实现时的组件名（Vue SFC）。所有可交互组件：键盘可达、`:focus-visible` 焦点环、触控目标 ≥ 40×40px。

## 目录

- 布局骨架：AppHeader · AppFooter · PageHeader · GridPaper
- 导航与入口：DomainCard · QuickStartEntry · FeaturedStrip · ContinueCard
- 标签与徽标：DifficultyBadge · StatusChip · MetaMono · TagChip
- 进度：ProgressTier · StreakBadge · HeatCalendar · MarkDoneButton
- 路线图：StageTrack · PathNode · BranchGroup · DependencyLine · RoadmapLegend
- 内容：LessonArticle · CodeBlock · ExternalResourceCard · TocPanel · PrevNextNav · FeedbackLink
- 测验：QuizCard · MistakeList
- 数据与反馈：StorageNotice · ConfirmDialog · Toast · EmptyState · ProfileIdentity · 数据管理三卡
- 表单与筛选：SearchInput · FilterTabs · ChoiceCard

---

## 1. 布局骨架

### AppHeader

- **用途**：全站导航，56px 高，sticky 顶部，底边 `--border-default`，背景 `--bg-surface`（不透明，盖住网格）。
- **结构**：`Logo(cs-study + 蓝色方点) | 主导航(首页/全部领域/找方向/个人中心) | SearchInput(P1 前为目标态占位) | 主CTA按钮`
- **主 CTA 规则**（F1.5）：本地有学习记录 → 「继续学习」(primary，指向最近知识点)；无记录 → 「开始学习」(primary，指向 /guide)。
- **状态**：当前路由项文字 `--text-primary` + 底部 2px `--accent` 短线；其余 `--text-secondary`。
- **移动端**（<640）：主导航折叠为汉堡抽屉（左滑入，`--shadow-overlay`）；搜索缩为图标；CTA 保留。

### AppFooter

- **结构**：单行三段——`① 站点导航链接 ② 内容纠错(跳 GitHub Issue 预填模板, F3.6) ③ 隐私声明 + 构建版本号(mono)`
- **隐私声明文案（固定）**：「本站不收集任何数据 · 学习记录仅存于本设备」。
- 背景 `--bg-surface-muted`，上边框 `--border-default`；移动端纵向堆叠。

### PageHeader

- **用途**：每页标题区，含唯一 `h1`（`--text-title-page`）+ 副说明（`--text-secondary`）+ 右侧动作区。
- **变体 · 图纸标题栏**（首页/路线图/个人中心可用）：标题下方挂四格 mono 元数据条（项目 / 图别 / 规模 / 版本·日期），1.5px `--border-strong` 描边、直角、内部竖线分隔。**每页至多一处，不做成长条堆砌。**

### GridPaper

- **用途**：「图类」容器（Hero、路线图、打卡日历、问答结果页），内部网格纹理加浓一档（tokens §5）。
- 直角 + `--border-strong` 1px 描边 + `--shadow-plate`。内部内容仍用卡片贴片。

---

## 2. 导航与入口

### DomainCard（领域卡片，F1.1）

```
┌──────────────────────┐
│ [icon]               │  icon: 24px Tabler，置于 accent 13% 淡底方角块
│ 前端开发              │  h3 · --text-section
│ 从页面三件套到框架…    │  1–2 行摘要，超长省略
│ 12 门课程 · 路线图 2 条 │  MetaMono
│ [L1–L4]              │  DifficultyBadge 跨度变体
└──────────────────────┘
```

- **状态**：默认（描边 + `--shadow-plate`）/ hover（投影加深 + 位移 1px，`--dur-fast`）/ focus-visible 同 hover。
- **规则**：整卡可点击（路由 `/domain/:slug`），键盘焦点同 hover；卡片内不嵌套其他可点元素。

### QuickStartEntry（新手快捷入口，F1.3）

- 横向 pill 卡：`预设标题 + 一句话 + →`。预设集合：「零基础从这里开始」「CS 学生补强路线」「转行求快」。
- 直角、虚线边框（区别于实体卡）；点击直达对应路线并提示「已设为当前路线」（写 `activePathId`）。

### FeaturedStrip（编辑精选，F1.4）

- 全宽横条：`📌 图标 + 「编辑精选」标 + 标题粗体 + 一句话(每周时长/周期) + 右侧文字按钮`。
- 左侧 4px `--accent` 竖条 + `--accent-subtle` 底；静态配置，无运行时统计。

### ContinueCard（继续学习卡，F1.5 / F4.3）

```
┌──────────────────────┐
│ 上次学到              │  caption · --text-secondary
│ Promise 与异步编程     │  --text-card
│ 前端开发 · 还需 15 分钟 │  MetaMono
│ ▓▓▓▓▓▓░░░░ 42%       │  ProgressTier 课程档
│ [继续学习]  连续 5 天   │  primary + StreakBadge
└──────────────────────┘
```

- 出现位置：首页 Hero 右侧、个人中心顶部。无记录时不渲染（首页该区域由找方向引导卡占位）。

---

## 3. 标签与徽标

### DifficultyBadge（难度徽标）

- 结构：`L{n} {等级名}`；等级名取固定词表（入门/基础/进阶/精通）。
- 视觉按 tokens §1.5 剖面线体系；`aria-label="难度 L3 进阶"`。
- **变体**：单级徽标 / 跨度徽标（`L1–L4`，取高者样式）。

### StatusChip（进度状态）

- 三态固定词表：`未开始`(faint+虚线) / `学习中`(teal) / `已完成`(success 实底)——tokens §1.7。
- 用于：课程章节列表、路线节点旁、错题条目。

### MetaMono（标注体元数据）

- mono 12px `--text-secondary`，承载：编号（D-03 / S2）、时长（est 45min · 4–6 周）、更新时间、构建 SHA。
- 分隔用 ` · `；**不做全大写、不加装饰前缀**（原则 3）。

### TagChip

- 知识点标签（frontmatter `tags`）；描边 pill、13px；超过 3 个折叠为 `+n`，点开 popover。

---

## 4. 进度

### ProgressTier（多级进度条，F4.2）

- **三档语义同一组件**：章节 / 课程 / 领域，用 `aria-label` 区分（如「课程完成度」）。
- 轨道：`--bg-surface-muted` 直角槽 + `--border-default` 描边；填充：`--accent` 直角；高度 8px；右端外标注百分比（mono）。
- 变体 · 剖面线填充：仅用于领域档（区别于课程档实色）。
- 增长动效：仅由「标记完成链」触发（tokens §7），时长 200ms。

### StreakBadge（连续学习，F4.4）

- 结构：`连续 {n} 天`，n ≥ 3 才显示；描边 pill；n 达成 7 的倍数时短暂切换为 `--warning` 底（里程碑提示，仅 320ms）。

### HeatCalendar（打卡日历，F4.4）

- **结构**：52–53 列 × 7 行格子（近一年）或当月视图（移动端默认）；格 12px 直角、间距 3px、四级 `--heat-*`。
- **数据**：从 `progress` 推导（F4.4），不单独存储。
- **可访问性**：容器 `role="img"` + `aria-label="学习日历：最近 12 周共学习 21 天"`；桌面悬浮 tooltip 显示「{日期} 完成 {n} 个知识点」；移动端点按同 tooltip。
- **图类容器**：外层包 GridPaper，右下角图例（四级方块 + 「少 → 多」）。

### MarkDoneButton（标记完成，F4.1）

```
未开始:   [ ○ 标记完成 ]        描边按钮
学习中:   [ ◐ 标记完成 ]        描边按钮(teal 边)
已完成:   [ ✓ 已完成 ]          success 实底；hover 浮现「取消完成」文字按钮
```

- 点击即写 localStorage（乐观更新）；「标记完成链」动效见 tokens §7。
- **失败态**：存储不可用 → Toast「进度无法保存：当前浏览器不允许本地存储，本次为游客试用」。

---

## 5. 路线图（F2 的核心表达，/path 页主体）

### 通用规则

- 纵向时间轴为默认布局；横向节点图为 lg 断点可选切换（页面内右上角 segmented 切换）。
- 依赖线：实线 = 顺序推进；虚线 = 并列分支（BranchGroup）；**不存在无语义的连线**。
- 全图先渲染为静态 SVG/CSS 图，hover/选中才出现焦点环——不做力导向动画。

### StageTrack（阶段轨道）

- 阶段标头：`S{n} · {阶段名}` + MetaMono 建议时长（`建议 4–6 周`）+ 阶段一句话。
- 纵向模式：左侧 2px 竖线轨道，节点挂线；横向模式：阶段为纵向泳道。

### PathNode（路线节点，F2.3/2.4/2.6）

```
┌────────────────────┐
│ ○ JavaScript ES6+   │  节点名 · 状态圈在左
│ L2 · est 45min      │  MetaMono
└────────────────────┘
```

- **状态**：未开始（虚线边）/ 学习中（teal 边）/ 已完成（success 边 + ✓）；当前推荐起点加 `--accent` 焦点环。
- 点击 → 跳转知识点页（F2.4）；hover → 浮出前置提示。
- **前置依赖提示**（F2.2）：前置未满足时，节点下方 `建议先完成：{前置节点名}`（`--warning` 文字），前置满足后消失。
- **可访问性**：整图提供文本替代（每阶段一个列表，含「前置：HTML5、CSS3」）；节点本身是链接元素。

### BranchGroup（分支组，F2.5）

- 同阶段并列选项（如 Vue 3 生态 / React 生态）：双节点纵向堆叠 + 左侧虚线引线 + 顶部 `二选一深入` 标签（mono）。
- 选中其一后另一支视觉降为 40% 透明（本地不记录该选择为完成态）。

### DependencyLine / RoadmapLegend

- 连线颜色一律 `--border-strong`；hover 节点时其关联线变 `--accent`。
- 图例固定在路线图右上角：`实线→顺序 · 虚线→分支 · ✓→已完成 · ○→未开始`。

---

## 6. 内容（知识点页组件群，F3）

### LessonArticle（正文容器）

- 列宽 720px、`--text-body-read`（16px/1.8）；内容模板六段式（需求 §3.4）映射为固定小节：
  `一句话定义(强调块) → 概念讲解 → 代码示例 → 常见坑 → 小练习 → 精选外链`。
- **一句话定义**：左侧 4px `--accent` 竖条 + `--accent-subtle` 底强调块。
- **常见坑**：`--warning-surface` 底 + `list` 图标小节，条目前缀 `坑 {n}`（mono）。
- 标题层级：正文内 h2 = 区块名，h3 = 小节；禁止正文内出现 h1。

### CodeBlock（F3.5）

- 结构：`头部(文件名 mono + 语言标签 + 右侧[复制]) + 代码区(Shiki blueprint-draft)`。
- 容器：`--bg-inset`、`--radius-node`、`--border-strong` 描边；行号可选（默认关）。
- 复制：点击 → 文案变「已复制 ✓」120ms 后还原；失败 → 「复制失败」。
- 无文件名的片段显示语言标签；头部背景 `--bg-surface-muted`。

### ExternalResourceCard（精选外链，F3.4）

- 结构：`[类型图标] {标题} | 类型徽标 + DifficultyBadge(L{外链自身难度}) | 推荐语一句`。
- 类型徽标：文档/书籍/视频/工具（tokens §6）；整卡为 `<a target="_blank" rel="noopener noreferrer">`。
- 规则：每页 3–5 条，超出的进「查看全部资源」折叠；外链在本站无内容时是唯一出口。

### TocPanel（页内目录）

- lg 显示于右侧粘性列（宽 200px）；当前小节高亮 `--accent` 短线；md 及以下折叠为正文顶部「本页目录」details 折叠块。

### PrevNextNav（上一篇/下一篇）

- 页脚上方双卡：`← 上一篇 {标题}` / `下一篇 {标题} →`，按章节顺序（构建期生成）；无边框虚线卡。

### FeedbackLink（报错/建议，F3.6）

- 右侧粘性列底部固定入口：`⚑ 报错/建议` → GitHub Issue 预填模板（页面路径 + 内容版本 SHA）。
- 仓库不可用（私有/离线）降级：点击 → 复制反馈模板到剪贴板 + Toast「模板已复制」。

### LastUpdated

- 正文尾部 MetaMono：`最后更新 2026-11-18 · v{git sha 短}`（构建期提取或 frontmatter `updated_at`）。

---

## 7. 测验（F5，P1）

### QuizCard

- 结构：`题干 + 选项列表(单选) + [提交] + 解析区(提交后展开)`。
- 选项：直角行卡；选中 = `--accent-subtle` 底 + `--accent` 边；提交后：对 = success 边 + ✓，错 = danger 边 + ✕，且正确项高亮 success。
- 解析区：`--bg-inset` 块，标题「解析」；展示关联知识点链接。
- 不判防作弊（答案随包下发是既定妥协，UI 不出现「考试/评分」字样，统一称「自测」）。

### MistakeList（错题本条目）

- 结构：`错题题干(截断) + 来源知识点链接 + StatusChip(未重做/已重做) + [重做]`。
- 按「知识点归类」分组显示（F5.3）；空状态引导去测验页。

---

## 8. 数据与反馈

### StorageNotice（仅存本设备提示，F4.7 —— 原则 5 的落点）

| 强度 | 场景 | 形态 |
| ---- | ---- | ---- |
| 常驻提示 | 个人中心顶部、设置页顶部 | `--warning-surface` 底提示条：「你的进度仅保存在本设备浏览器中 · [导出备份]」 |
| 页脚链接 | 知识点页尾部 | 一行 caption + 链接「进度仅存本设备 · 导出备份」 |
| 全局警示 | 隐私模式 / 存储写入失败 | 页头下固定警示条：「当前为游客试用：进度刷新后丢失」`--danger-subtle` 底 |

- 累计学习 ≥ 7 天时（F4.7 风险应对）：常驻提示追加一句「已学习 7 天，建议导出一份备份」。

### ConfirmDialog

- headless 弹窗 + 蓝图皮肤：`--radius-panel`、`--shadow-overlay`、直角标题栏。
- **破坏性操作专用规则**：标题说后果（「清空本机全部学习数据」），正文说不可逆性，主按钮 `--danger` 实底、文案用动词（「清空数据」），次按钮「取消」。不出现「确认/OK」。

### Toast

- 右下角浮出，`--shadow-overlay`、`--radius-card`；成功左侧 `--success` 4px 条，失败 `--danger`；200ms 进出；最多同时 3 条；不阻塞操作。

### EmptyState

- 结构：`插画位(emoji 允许) + 一句话说明 + 行动按钮`。文案给出路（如：「还没有学习记录——从找方向开始，或直接浏览全部领域」）。
- 用于：继续学习无记录、收藏为空、错题本为空、搜索无结果。

### ProfileIdentity（本地档案，F7.1）

- 结构：`emoji 头像(预设 8 选 1) + 昵称(可空,默认「同学」) + 学习起始日`。
- 昵称/头像为纯本地可选字段，UI 上永远不出现「注册/登录/账号」字样。

### 数据管理三卡（设置页用，F7.4–7.6）

| 卡 | 内容 | 规则 |
| ---- | ---- | ---- |
| ExportCard | 「导出数据」primary + 上次导出时间 | 产出 `{app, schemaVersion, exportedAt, data}` JSON；文件名 `cs-study-backup-{date}.json` |
| ImportCard | 「导入数据」+ 合并/覆盖选择 | 覆盖必须 ConfirmDialog 二次确认；导入后 Toast 显示合并统计 |
| ClearDataCard | 「清空数据」danger 描边卡 + 当前占用说明 | 二次确认；成功回游客态并 Toast |

- 三卡下方常驻 StorageNotice 常驻条 + 本地用量（`约 {kb} KB / 上限 1MB`，mono）。

---

## 9. 表单与筛选

### SearchInput

- `--radius-full`（唯一大圆角例外）、`--bg-inset`、放大镜图标；占位「搜索课程 / 知识点…」。
- 全局搜索 M2（F6）前：Header 中为目标态占位，点击 Toast「搜索功能即将上线」。

### FilterTabs（难度筛选，F6.2）

- segmented 直角组：`全部 | L1 | L2 | L3 | L4`；选中 = `--accent-subtle` 底 + accent 文字。
- 领域页课程列表用；与内容类型筛选可组合（两组 tabs 并排）。

### ChoiceCard（找方向问答选项，F1.2）

- 问题标题（`--text-section`）+ 2–3 张纵向选项卡：`选项标题 + 一句解释`；选中 = accent 焦点环；点击即进下一题（单选直进）。
- 底部进度标注 mono：`第 2 / 3 题`；可回退（← 返回上一题）。结果页见 [03-guide.md](./pages/03-guide.md)。

---

## 10. 修订记录

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-11-21 | v1.0 | 按 A 蓝图制图方向建立组件规范；组件名即实现名 |
