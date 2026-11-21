# cs-study · UI 页面规范

| 项 | 内容 |
| ---- | ---- |
| 版本 | v1.0 |
| 定稿日期 | 2026-11-21 |
| 视觉方向 | **A 蓝图制图（Blueprint）** —— 4 方向比选后定选 |
| 比选存档 | [style-options.html](./style-options.html)（同内容四皮肤对比） |
| 依据文档 | [需求规划文档-纯前端版.md](../docs/需求规划文档-纯前端版.md) v0.1 |
| 主题策略 | 仅浅色先行；token 一律语义命名，预留深色扩展 |
| 技术衔接 | Vue 3 + TS + Tailwind CSS + Shiki；自建轻组件 + headless 行为库 |

---

## 0. 一句话定位

> **界面是一张张工程图纸：网格纸是桌面，卡片是贴片，等宽字是标注，依赖关系是连线。**

产品的核心隐喻是「学习地图」（领域 → 路线 → 课程 → 知识点），蓝图制图方向让这个隐喻字面成立：
路线图本来就长得像施工图，进度本来就值得像图纸上的验收标记一样被郑重对待。

---

## 1. 设计原则（六条，冲突时按序号裁决）

1. **每一页都是一张图。** 页面有明确的「图框—标题栏—内容区」结构感；重要页面（首页、路线图、个人中心）可出现图纸标题栏变体（项目/图别/版本三格元数据）。装饰服务于「这是张图」的认知，不做无信息装饰。
2. **线稿优先，填色克制。** 形状靠 1px 描边 + 直角 + 2px 偏移投影表达；实色填充只用于三种语义：主操作（蓝图蓝）、完成（图例绿）、点亮/警示（批注红）。大面积渐变、彩色阴影、玻璃拟态一律不用。
3. **标注即信息。** 时长、编号、难度、更新时间等元数据一律走等宽「标注体」，像图纸尺寸标注一样精确；不写营销式修饰文案，不用 eyebrow 全大写标题。
4. **依赖可见。** 任何「先后关系」都必须显式：路线图连线、前置提示（F2.2）、课程前置要求（F3.2）。状态变化（未开始/进行中/已完成）必须能被一眼读出，不允许隐性进度。
5. **隐私可见。** 「进度仅保存在本设备」是一等公民 UI（F4.7）：个人中心常驻、知识点页页脚常驻、隐私模式升级为全局警示条。导出备份入口跟着提示走。
6. **反馈即时。** 本地数据零延迟，所有动作即刻反映；全站唯一编排动效时刻是「标记完成链」（按钮打勾 → 进度条增长 → 节点点亮），一次动作一次动效，不做入场瀑布、不做自动轮播。

---

## 2. 文件索引（读规范的顺序）

| 文件 | 内容 | 什么时候读 |
| ---- | ---- | ---- |
| [tokens.md](./tokens.md) | 设计令牌：色彩/字体/间距/圆角/阴影/网格纸/图标/动效/Tailwind 映射/Shiki 主题 | 写任何样式之前；**令牌的唯一来源** |
| [components.md](./components.md) | 全部 UI 组件的结构/变体/状态/规则 | 实现组件、评审页面时 |
| [pages/01-home.md](./pages/01-home.md) … [pages/12-mistakes.md](./pages/12-mistakes.md) | 12 个页面的布局线框与区块明细 | 实现对应页面时 |
| [style-options.html](./style-options.html) | 方向比选存档（A 已定选） | 了解设计决策背景时 |

**规范优先级**：tokens.md > components.md > pages/*。页面文档只定义「布局与区块」，不复述组件细节；冲突时以 tokens/components 为准并回来修订页面文档。

---

## 3. 全局布局

```
┌────────────────────────────────────────────────────────────┐
│ AppHeader · 56px sticky（Logo · 主导航 · 搜索 · 主 CTA）      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   PageContainer（页面内容列，随页面类型取宽）                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ AppFooter（导航 · 内容纠错 GitHub Issue · 隐私声明 · 版本号）  │
└────────────────────────────────────────────────────────────┘
```

| 容器 | 最大宽度 | 用途 |
| ---- | ---- | ---- |
| `container-wide` | 1120px | 首页、全部领域、个人中心、错题本 |
| `container-text` | 720px | 知识点正文、课程详情、找方向问答、设置 |
| `container-full` | 自适应 | 路线图（横向模式需要横向空间） |

**断点**（最小支持 375px）：

| 断点 | 范围 | 行为 |
| ---- | ---- | ---- |
| `sm` | < 640px | 单列；主导航折叠为抽屉；侧栏/目录折叠为顶部下拉或隐藏 |
| `md` | 640–1023px | 卡片墙 2 列；知识点页目录折叠；路线图默认纵向 |
| `lg` | ≥ 1024px | 卡片墙 3 列；知识点页三栏（目录 / 正文 / TOC）；路线图可切横向 |

**网格纸背景规则**：全站 `<body>` 默认铺 26px 网格纹理（`--bg-grid-line`，纯 CSS 渐变，零资源开销）；所有卡片、面板为实色白覆盖其上。**列表页正文区、弹窗内不加网格**（避免阅读噪声）；「图类」区块（首页 Hero、路线图、打卡日历、找方向结果页）网格更明显一档（间距不变、透明度 ×1.5）。

---

## 4. 页面地图（路由 → 规范文件）

| 路由 | 页面 | 功能 | 优先级 | 规范 |
| ---- | ---- | ---- | ---- | ---- |
| `/` | 首页 | F1 | P0 | [01-home.md](./pages/01-home.md) |
| `/explore` | 全部领域浏览 | F1 | P0 | [02-explore.md](./pages/02-explore.md) |
| `/guide` | 「找方向」引导问答 | F1 | P0 | [03-guide.md](./pages/03-guide.md) |
| `/domain/:slug` | 领域详情 | F3 | P0 | [04-domain.md](./pages/04-domain.md) |
| `/path/:slug` | 学习路线图 | F2 | P0 | [05-roadmap.md](./pages/05-roadmap.md) |
| `/course/:slug` | 课程详情 | F3 | P0 | [06-course.md](./pages/06-course.md) |
| `/course/:slug/lesson/:lessonSlug` | 知识点内容页 | F3/F4 | P0 | [07-lesson.md](./pages/07-lesson.md) |
| `/profile` | 个人中心 | F4/F7 | P0 | [08-profile.md](./pages/08-profile.md) |
| `/settings` | 数据管理 | F7 | P0 | [09-settings.md](./pages/09-settings.md) |
| `/search` | 搜索结果 | F6 | P1 | [10-search.md](./pages/10-search.md) |
| `/quiz/:id` | 测验作答 | F5 | P1 | [11-quiz.md](./pages/11-quiz.md) |
| `/mistakes` | 错题本 | F5 | P1 | [12-mistakes.md](./pages/12-mistakes.md) |

---

## 5. 全局组件（详见 components.md）

- **AppHeader**：Logo + `首页 / 全部领域 / 找方向 / 个人中心` + 全局搜索（P1 前为目标态占位）+ 主 CTA（有学习记录 → 「继续学习」；无 → 「开始学习」→ /guide）
- **AppFooter**：隐私声明「本站不收集任何数据 · 学习记录仅存于本设备」+ 内容纠错（GitHub Issue）+ 构建版本号（Git SHA）
- **StorageNotice**：仅存本设备提示（3 种强度：常驻提示条 / 页脚链接 / 隐私模式全局警示）
- **Toast / ConfirmDialog / EmptyState**：全局反馈三件套；清空数据等破坏性操作必须 ConfirmDialog 二次确认

---

## 6. 硬性约束（来自需求 §5，逐条落到 UI）

| 约束 | UI 落点 |
| ---- | ---- |
| ≥ 375px 可正常阅读与操作 | 所有页面经 375 / 640 / 1024 三档验收；触控目标 ≥ 40×40px |
| localStorage 不可用降级 | 全局警示条「当前为游客试用：进度刷新后丢失」，UI 可浏览可点，不白屏不报错弹窗 |
| 破坏性操作二次确认 | 清空数据（F7.6）、导入覆盖（F7.5）必须 ConfirmDialog + 明确后果文案 |
| Lighthouse Perf ≥ 90 / SEO ≥ 95 | 每页唯一 `h1`；语义化 landmark（header/nav/main/footer）；内容页标题与 meta 由内容 frontmatter 生成 |
| 外链安全 | 所有外链 `rel="noopener noreferrer"` + ExternalResourceCard 统一出口 |
| 可访问性 | 键盘可达 + `:focus-visible` 焦点环；文本对比 ≥ 4.5:1（tokens.md 已校）；路线图节点提供文本替代（前置依赖列表）；打卡日历提供 aria-label 与表格化读法 |
| 动效克制 | 遵守 tokens.md §7；`prefers-reduced-motion` 下所有动效降级为瞬时 |

---

## 7. 与技术选型的衔接

| 项 | 决定 | 说明 |
| ---- | ---- | ---- |
| 样式 | **Tailwind CSS v4**（CSS-first `@theme`），令牌来源 tokens.md §8 | 实际令牌表在 `frontend/src/styles/main.css`；透明度修饰符经 color-mix 可用 |
| 组件库 | **自建轻组件**（components.md 即其实现规格） | M1 已按此实现（`src/components/`）；复杂行为组件引入 headless 库时仍遵守本规范皮肤 |
| 代码高亮 | Shiki 构建期高亮，自定义主题 `blueprint-draft` | 色板见 tokens.md §9，与页面用色同源；在 `tools/build-content.mjs` 中实现 |
| 图标 | Tabler Icons（线性、stroke 1.5、24px 网格），npm 包 `@tabler/icons-vue` | 规则见 tokens.md §6 |
| Markdown 正文 | markdown-it 构建期编译为 HTML；正文容器样式即 `.md-body`（components.md LessonArticle） | 正文排版遵循「中文长文」参数：16px / 1.8 行高 / 720px 列宽 |
| 字体 | MVP 用系统字体栈（零下载，护首屏 ≤1.5s）；M2 可选自托管 MiSans/思源黑体子集 | 栈定义见 tokens.md §3 |

---

## 8. 修订记录

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-11-21 | v1.0 | 方向比选（A 蓝图制图）定稿；建立 tokens / components / pages 三层规范 |
| 2026-11-22 | v1.1 | M0 技术定案随实现校准：Tailwind v4 CSS-first、Shiki 构建期编译、vite-ssg 预渲染；M1 脚手架落地 |
