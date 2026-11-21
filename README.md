# cs-study · 计算机科学技术学习平台（纯前端版）

> 为 CS 初学者提供一张清晰的「学习地图」，打开就能学，进度随身存。
> 零后端依赖：静态内容 + 浏览器本地存储。需求详见 [docs/需求规划文档-纯前端版.md](./docs/需求规划文档-纯前端版.md)。

## 仓库结构

```
cs-study/
├── docs/        # 需求文档
├── design/      # UI 页面规范（tokens / components / pages）
├── content/     # 静态内容（领域/路线/课程/知识点/站点配置）
├── frontend/    # 前台（Vue 3 + TS + Vite + vite-ssg + Tailwind v4）
├── tools/       # 内容校验/构建脚本、内容脚手架
└── README.md
```

## 快速开始

```bash
cd frontend
pnpm install
pnpm dev        # 开发（自动先执行内容构建）
pnpm build      # SSG 构建静态站点 → dist/
pnpm preview    # 本地预览构建产物
```

> 内容构建脚本 `tools/build-content.mjs` 会在 dev/build 前自动执行：
> 校验 `content/`（schema、slug 唯一、引用完整性、外链格式）并把 Markdown
> 构建期编译为 HTML（Shiki `blueprint-draft` 主题）。**校验不通过则构建失败**。

## 部署（M2 定案：GitHub Pages）

`main` 分支的每次 push 会触发两条流水线：

1. **CI**（`.github/workflows/ci.yml`）：内容校验 → 类型检查 → SSG 构建冒烟；
2. **Deploy**（`.github/workflows/deploy.yml`）：构建静态产物 → 发布到 GitHub Pages。
   线上地址：<https://guhl0427.github.io/cs-study/>

- 项目页 base 由 CI 注入 `VITE_BASE=/cs-study/`（`vite.config.ts`），本地开发不受影响；
- sitemap.xml 由内容构建按 `--site` 参数生成（gitignore，属构建产物）；
- 部署即回滚：GitHub Pages 上重新运行上一版 Deploy 工作流，或 revert 后 push。

## 内容目录规范（即内容模型）

```
content/
├── domains.json          # 领域数组（首页卡片墙与 /explore 的数据源）
├── site.json             # 站点级静态配置：新手快捷入口、编辑精选
├── paths/{pathId}.json   # 学习路线（阶段 + 节点 + 分支 + 前置）
├── courses/{courseId}.json  # 课程（章节列表引用 lesson id）
└── lessons/{lessonId}.md    # 知识点正文，frontmatter 承载元数据
```

- **元数据单一来源**：知识点的 `id/slug/title/difficulty/estMinutes/tags/resources`
  全部写在 `lessons/{id}.md` 的 frontmatter 中；课程 JSON 只引用 `lesson id`（顺序即章节内顺序）。
- **frontmatter 模板**：

  ```yaml
  ---
  id: l-html-doc-structure          # 必须与文件名一致
  slug: doc-structure               # 全站唯一，用于路由
  title: 文档结构与常用标签
  difficulty: 1                     # 1=L1 入门 … 4=L4 精通
  estMinutes: 30
  tags: [HTML, 入门]
  summary: 一句话摘要（列表与搜索用）
  updated: 2026-11-21
  resources:                        # 精选外链（可选）
    - id: r-html-mdn
      title: MDN · HTML 基础
      url: https://developer.mozilla.org/…
      type: doc                     # doc | book | video | tool
      difficulty: 1
      note: 推荐理由一句话
  ---
  ```

- **正文模板**（六段式，顺序固定）：`> 一句话定义`（blockquote）→ `## 概念讲解` →
  `## 代码示例` → `## 常见坑` → `## 小练习`（1–3 题）。精选外链由 frontmatter 渲染，不写进正文。

### 新建内容（脚手架）

```bash
node tools/scaffold.mjs lesson --course c-web-frontend-basics --title "新知识点"
node tools/scaffold.mjs course --domain frontend --title "新课程"
```

## 架构要点

- **服务适配层**：页面只调用 `frontend/src/api/contracts.ts` 的接口；
  禁止直接读内容 JSON 或直接操作 localStorage（未来接后端时新增 `api/remote/` 即可，页面零改动）。
- **用户数据**：全部存于 localStorage（`cs-study:*` 键族，带 `schemaVersion`），
  统计（打卡日历/streak/各领域进度）一律由进度记录推导，不单独存储。
- **SSG**：vite-ssg 构建期预渲染全部内容路由（SEO 硬性需求 §5）；
  依赖本地存储的组件通过 `useClientMounted()` 延迟到客户端渲染，避免水合不一致。

## UI 规范

实现必须遵循 [design/](./design/README.md)：视觉方向「A 蓝图制图」，令牌以
[design/tokens.md](./design/tokens.md) 为唯一来源（`frontend/src/styles/main.css` 的 `@theme` 与其同步）。

## 内容贡献流程

1. 从 `main` 拉分支（「Git 分支即草稿」，F8.3）；
2. 用脚手架生成模板，按上文模板写作；
3. 提交 PR——CI 执行内容校验 + 构建冒烟（`tools/` 与 `frontend/` 的 `content:build`）；
4. 评审合并即发布（静态产物由 CI 部署到托管平台）。
