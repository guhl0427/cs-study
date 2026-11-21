# Design Tokens · 令牌单一来源

> 本文件是所有视觉值的**唯一来源**。components.md 与 pages/* 只引用令牌名，不出现裸色值；
> 实现代码中的 CSS 变量与 Tailwind 主题必须由本文件生成/对齐（§8 提供映射代码）。
> 主题策略：仅浅色先行。所有令牌按语义命名（`--accent` 而非 `--blue-600`），未来加深色主题只需替换变量表。

---

## 1. 色彩

### 1.1 基底（图纸与贴片）

| 令牌 | 值 | 用途 |
| ---- | ---- | ---- |
| `--bg-page` | `#F1F6FA` | 页面底色（图纸纸面），body 默认 |
| `--bg-grid-line` | `rgba(23, 94, 150, 0.09)` | 网格纸纹理线色，仅作背景纹理（§5） |
| `--bg-surface` | `#FFFFFF` | 卡片 / 面板（贴片） |
| `--bg-surface-muted` | `#EDF3F8` | 次级面板、表头、区块底、禁用底 |
| `--bg-inset` | `#F6FAFD` | 输入框、代码块、引用块内凹面 |

### 1.2 文字

| 令牌 | 值 | 用途 | 对比 |
| ---- | ---- | ---- | ---- |
| `--text-primary` | `#14293D` | 标题与正文 | ≈13:1 ✓ |
| `--text-secondary` | `#52677C` | 次要说明、元数据 | ≈5.7:1 ✓ |
| `--text-faint` | `#7E93A6` | 占位符、禁用、装饰性标注 | ≈3.4:1，**禁用于正文**，仅占位/≥18px/装饰 |
| `--text-on-accent` | `#FFFFFF` | 蓝底/绿底/墨底上的文字 | 对各自底 ≥5:1 ✓ |

### 1.3 边框

| 令牌 | 值 | 用途 |
| ---- | ---- | ---- |
| `--border-default` | `#C6D8E4` | 分隔线、表格线、弱边框 |
| `--border-strong` | `#7FA2BC` | 卡片主描边、图纸标题栏、输入框聚焦前的边 |

### 1.4 品牌与语义色

| 令牌 | 值 | 语义 | 用途 |
| ---- | ---- | ---- | ---- |
| `--accent` | `#1B62A6` | 蓝图蓝 · **主操作** | 主按钮、当前节点、链接、选中态 |
| `--accent-strong` | `#144E86` | 主操作 hover/按压 | 仅交互态 |
| `--accent-subtle` | `#DCEAF6` | 主操作淡底 | 选中项底色、聚焦徽底 |
| `--accent-2` | `#0E7C86` | 制图青 · **进行中/次强调** | 「学习中」状态、次级链接 hover、辅助图形 |
| `--success` | `#2E7D4F` | 图例绿 · **已完成** | 完成状态、校验通过 |
| `--success-subtle` | `#DFF0E6` | 完成淡底 | 已完成条目底色 |
| `--warning` | `#8A5A11` | 标注琥珀 · **注意**（文字安全色） | 备份提醒、数据量提示文案 |
| `--warning-surface` | `#F5E9D4` | 注意淡底 | 提示条底 |
| `--danger` | `#B5402E` | 批注红 · **警示/破坏性** | 危险按钮描边、报错图形 |
| `--danger-text` | `#9E3620` | 批注红（文字安全色） | 错误文案 |
| `--danger-subtle` | `#F7E3DE` | 警示淡底 | 危险区底色 |

**用色纪律（原则 2「填色克制」）**：实色填充只允许出现在——主按钮、当前节点、已完成状态、危险操作、精选标记。其余一律描边表达。`--accent-2` 与 `--warning` 不同时出现在同一组件。

### 1.5 难度体系（全站统一，需求 §3.1 的 L1–L4）

蓝图图例式表达：**剖面线密度 = 难度**，与状态色无关。

| 等级 | 视觉 | 实现 |
| ---- | ---- | ---- |
| L1 入门 | 空白 + 描边 | 底 `--bg-surface`，边 `--border-strong`，字 `--text-secondary` |
| L2 基础 | 稀剖面线 | `repeating-linear-gradient(45deg, transparent 0 4px, rgba(27,98,166,.35) 4px 5.5px)`，字 `--accent` |
| L3 进阶 | 密剖面线 | 同上 60% 浓度（3px/2px 节距），字 `--accent-strong` |
| L4 精通 | 满填 | 底 `--text-primary`，字 `--bg-page`（反白） |

领域卡上的跨度徽标（如「L1–L4」）取范围两端中较高档的样式。难度徽标必须带 `aria-label="难度 L3 进阶"`。

### 1.6 打卡热力四级（F4.4）

| 令牌 | 值 | 含义 |
| ---- | ---- | ---- |
| `--heat-0` | `#E2ECF3` | 无记录（底格，非白——与贴片区分） |
| `--heat-1` | `#9FC3DD` | 完成 1 个知识点 |
| `--heat-2` | `#4E8FBF` | 完成 2–3 个 |
| `--heat-3` | `#1B62A6` | 完成 ≥4 个 |

### 1.7 状态词与色的映射（全站唯一词表）

| 状态 | 用词 | 视觉 |
| ---- | ---- | ---- |
| 未开始 | 未开始 | `--text-faint` 字 + `--border-default` **虚线**边 |
| 进行中 | 学习中 | `--accent-2` 字 + 同色描边 + `--bg-surface` 底 |
| 已完成 | 已完成 | `--success` 反白实底（徽标）/ `--success` 描边 + `--success-subtle` 底（条目） |

词汇表纪律（原则 6）：同一动作全站同名——「标记完成」→ 完成后为「已完成 ✓」+ hover 才显「取消完成」；入口统一叫「继续学习」；引导统一叫「找方向」。

---

## 2. 字体

### 2.1 字体栈

```css
--font-sans: "PingFang SC", "HarmonyOS Sans SC", "MiSans",
             "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei",
             system-ui, sans-serif;
--font-mono: "Cascadia Code", "JetBrains Mono", "SFMono-Regular",
             Consolas, "Liberation Mono", monospace;
```

MVP 零字体下载（护首屏 ≤1.5s）。M2 起可选自托管子集化 MiSans（仅 display 两档）。

### 2.2 字号阶梯

| 令牌 | 值 | 行高 | 字重 | 用途 |
| ---- | ---- | ---- | ---- | ---- |
| `--text-display` | 28px | 1.3 | 800 | 首页 Hero 标题 |
| `--text-title-page` | 22px | 1.35 | 800 | 页面标题（每页唯一 h1） |
| `--text-section` | 18px | 1.4 | 700 | 区块标题、领域名 |
| `--text-card` | 15px | 1.5 | 700 | 卡片标题 |
| `--text-body-ui` | 14px | 1.7 | 400 | UI 正文、列表项 |
| `--text-body-read` | 16px | 1.8 | 400 | 知识点正文（720px 列宽，≈40–45 字/行） |
| `--text-caption` | 13px | 1.6 | 400 | 辅助说明、表格副列 |
| `--text-label-mono` | 12px | 1.4 | 500 | **标注体**：编号/时长/难度/路径（mono） |

**中文排版细则**：引号用「」；数字与单位间加空格（「4–6 周」）；省略号用「…」；时间用 24 小时制；代码内不做中文标点替换。

---

## 3. 间距（4px 基准栅格）

| 令牌 | 值 | 典型用途 |
| ---- | ---- | ---- |
| `--space-1` ~ `--space-3` | 4 / 8 / 12px | 图标与文字、徽标内距 |
| `--space-4` | 16px | 卡片内距（移动端）、元素间距 |
| `--space-5` | 20px | 卡片内距（桌面） |
| `--space-6` | 24px | 面板内距、区块间 |
| `--space-8` | 32px | 区块间（大） |
| `--space-10` | 40px | 页面区带间 |
| `--space-12` | 48px | 页面级留白 |

页面垂直节奏：区块间 `--space-8`；Hero 上下 `--space-10`；正文段落间 1em。

---

## 4. 圆角 / 边框 / 阴影 / 焦点

| 令牌 | 值 | 用途 |
| ---- | ---- | ---- |
| `--radius-node` | 2px | 路线节点、徽标、代码块 |
| `--radius-card` | 3px | 卡片、按钮、输入框 |
| `--radius-panel` | 4px | 弹窗、大面板 |
| `--radius-full` | 999px | 搜索框、标签 pill、头像 |
| `--border-w` | 1px | 全站默认线宽；强调态靠**换色**不靠加粗（标题栏可用 1.5px） |
| `--shadow-plate` | `2px 2px 0 0 rgba(127,162,188,.40)` | 卡片默认「贴片偏移投影」 |
| `--shadow-plate-hover` | `3px 3px 0 0 rgba(127,162,188,.45)` | 卡片 hover（位移 1px + 投影加深，120ms） |
| `--shadow-overlay` | `0 12px 32px rgba(20,41,61,.16)` | 弹窗、抽屉 |
| `--focus-ring` | `0 0 0 3px rgba(27,98,166,.30)` | 配合 `outline: 2px solid var(--accent); outline-offset: 2px` 用于 `:focus-visible` |

**直角纪律**：全站无大圆角（≤4px）。搜索框、标签用 `--radius-full` 是唯一例外（输入体验）。

---

## 5. 网格纸纹理

```css
/* body 默认；图类区块（Hero/路线图/日历/问答结果）透明度×1.5 */
--grid-paper:
  linear-gradient(var(--bg-grid-line) 1px, transparent 1px),
  linear-gradient(90deg, var(--bg-grid-line) 1px, transparent 1px);
background-image: var(--grid-paper);
background-size: 26px 26px;
```

- 纯 CSS 渐变实现，零图片资源、零性能开销。
- 卡片/面板/弹窗为实色面覆盖在纸上——「纸是桌面，卡片是贴片」。
- 阅读区（知识点正文、弹窗表单）的**贴片内部**不加网格。

---

## 6. 图标

- 来源：**Tabler Icons**（MIT），24px 网格，stroke `1.5`，butt 线帽——与制图线稿语言一致。
- 尺寸：UI 图标 16px（行内）/ 20px（按钮内）；领域图标 24px（卡片）/ 32px（领域页头）。
- 领域图标映射（content/domains.json 的 `icon` 字段取 Tabler 名）：

| 领域 | 图标 | 领域 | 图标 |
| ---- | ---- | ---- | ---- |
| 计算机基础 | `cpu` | 数据库 | `database` |
| 编程语言 | `file-code` | 开发工具与环境 | `terminal-2` |
| 前端开发 | `code` | 软件工程 | `git-branch` |
| 后端开发 | `server-2` | AI 与数据 | `binary` |
| 选修拓展 | `puzzle` | | |

- 外链资源类型徽标（F3.4）：`book`（书籍）/ `file-text`（文档）/ `video`（视频）/ `tool`（工具）。
- 禁用 emoji 作为 UI 图标；emoji 仅允许出现在用户头像预设（F7.1）与空状态插画位。

---

## 7. 动效

| 令牌 | 值 | 用途 |
| ---- | ---- | ---- |
| `--dur-fast` | 120ms | hover、按压、复制反馈 |
| `--dur-base` | 200ms | 面板展开、抽屉、Toast 进出 |
| `--dur-moment` | 320ms | 「标记完成链」专用（原则 6） |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.3, 1)` | 全站唯一缓动 |

**克制清单**：无入场瀑布动画；无自动轮播/自动展开；无装饰性悬浮光效；hover 仅允许 投影加深 / 换色 / 边框实线化 三种。
**唯一编排时刻**：「标记完成」——按钮打勾（120ms）→ 进度条增长（200ms）→ 路线图节点点亮（320ms），同链触发、单次播放。
`prefers-reduced-motion: reduce` 时：全部时长归零，仅保留透明度瞬时切换。

---

## 8. Tailwind 主题映射（v4 CSS-first，已随实现定稿）

实现采用 **Tailwind CSS v4**：令牌不再走 `tailwind.config.js`，而是写在
`frontend/src/styles/main.css` 的 `@theme` 块中（**与本文件同步维护，tokens.md 为准**）：

```css
@import 'tailwindcss';

@theme {
  /* 色彩：--color-page / --color-surface / --color-ink(-2/-3) / --color-line(-strong)
     --color-accent(-strong/-subtle) / --color-teal / --color-ok(-subtle) / --color-warn(-subtle)
     --color-danger(-text/-subtle) / --color-heat-0..3 —— 值见本文件 §1 */
  /* 圆角：--radius-node: 2px / --radius-card: 3px / --radius-panel: 4px
     阴影：--shadow-plate / --shadow-plate-hover / --shadow-overlay
     字体：--font-sans / --font-mono
     字号：--text-display … --text-label-mono（含 --text-*--line-height） */
}
```

生成的工具类：`bg-page`、`text-ink-2`、`border-line-strong`、`rounded-node`、`shadow-plate`、
`text-body-read` 等，与 §1–§4 令牌一一对应。

> v4 的透明度修饰符（`bg-ink/40`）经 `color-mix` 对 CSS 变量色直接可用——
> 这比 v3 的映射更干净；`-subtle` 令牌仍保留为显式语义用途。
> 网格纸纹理、按钮/卡片/正文排版等组件级样式位于同文件 `@layer base/components`
> （`.grid-zone`、`.btn-*`、`.card-plate`、`.meta-mono`、`.md-body`、`.code-block`）。

---

## 9. Shiki 主题 `blueprint-draft`（代码高亮，与页面同源）

| Token | 色 | 说明 |
| ---- | ---- | ---- |
| 背景 | `var(--bg-inset)` `#F6FAFD` | 代码块用 `--radius-node` + `--border-strong` 描边 |
| keyword | `#1B62A6` **加粗** | 关键词 = 主操作蓝 |
| function | `#0E7C86` | 函数 = 制图青 |
| string | `#2E7D4F` | 字符串 = 图例绿 |
| number | `#7C5CBF` | 数字（唯一非语义色，纯标注用紫） |
| comment | `#52677C` 斜体 | 注释 = 次要文字 |
| variable / plain | `#14293D` | 正文墨 |
| punctuation | `#52677C` | 标点 |
| 行号（可选开） | `#7E93A6` | `--text-faint` |

---

## 10. 修订记录

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-11-21 | v1.0 | 依「A 蓝图制图」方向建立全部令牌；对比度按浅色底校验 |
| 2026-11-22 | v1.1 | §8 更新为 Tailwind v4 CSS-first 实际实现（@theme + color-mix 透明度）；随前端脚手架落地校准 |
