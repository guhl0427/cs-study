# 更新日志 Changelog

本项目的全部显著变更记录于此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循语义化版本（MVP 阶段为 0.x，1.0.0 待 P0/P1 全部验收后定）。

**维护规则**：每次功能合并到 `main` 或发布上线时更新本文件——条目写「用户/内容贡献者可感知的变化」，不逐条复述 commit；未发布的变更先记在 `[Unreleased]` 下。

---

## [Unreleased]

### 修复

- 知识点页「上一篇 / 下一篇」点击后仅路由变化、页面内容不刷新：同路由记录间跳转复用组件实例导致 `setup` 不重跑，现对 `<router-view>` 按路径加 key 强制重建页面（同类问题一并覆盖课程页/领域页/路线页/测验页）

## [0.3.0] – 2026-11-22 · M2 补完 + 夜航主题

### 新增

- **单元测试基线**：Vitest 接入，30 例覆盖 storage 导入解析/合并/覆盖/FIFO 截断、streak 与打卡推导、搜索分词器与高亮转义（XSS 红线）；CI 新增 test 步骤
- **找方向结果卡**（F1.2 收尾）：个人中心可查看推荐路线、完成时间并一键重测
- **PR 预览部署**（F8.3 收尾）：内容 PR 自动构建 `preview/pr-N/` 预览站点（以 main 生产版作底座合并发布，fork PR 自动跳过）
- **编程语言领域**：Python 入门课程（语法速览 / 列表字典 / 异常调试 / 模块与虚拟环境）+ 路线；找方向匹配表随之更新（backend 正式映射、AI 降级起点改指 Python）
- **SEO 进阶**：canonical、Open Graph 全套、知识点页 LearningResource JSON-LD、站点级 WebSite JSON-LD
- **UX 小件**：代码块行号（F3.5 可选项落地）；打卡日历移动端切换当月视图
- **深色主题（夜航蓝图）**：语义令牌整套暗色套件、Header 日/月切换、选择持久化、Shiki 双主题代码块、首帧防闪烁

### 变更

- Shiki 升级为双主题输出（浅色内联 + `--shiki-dark` 变量），代码块随主题即时切换
- 可见文字色令牌补齐 `--color-on-accent` / `--color-on-ok`（实底按钮文字随主题反转）


## [0.2.1] – 2026-11-22

### 修复

- 领域卡难度跨度改用**知识点实际难度范围**（原取课程标注字段，新领域显示「L1–L1」与内容不符）（bd34145）

## [0.2.0] – 2026-11-22 · M2 完善期上线 🚀

线上地址：<https://guhl0427.github.io/cs-study/>

### 新增

- **全局搜索**（F6.1/F6.2）：MiniSearch 构建期索引 + CJK 单字/二元组分词；`/search` 页支持 `?q=` URL 同步、领域 × 难度组合过滤、命中 `<mark>` 高亮；Header 入口与全局 `⌘K` / `Ctrl+K`（599b2b8）
- **测验与错题本**（F5.1/F5.3）：章节随堂练习 + 课程综合自测（单题逐题、即时判分与解析、完成页正确率与薄弱知识点）；错题本按知识点归类分组、重做状态过滤；作答记录本地持久化并随导出迁移（a81b682）
- **SEO 构建期化**：`@unhead/vue` 注入 per-page title/description，预渲染 HTML 即含完整 head；内容页 description 来自 frontmatter 摘要（26d4174）
- **内容扩充至 5 领域**（M2 里程碑）：+后端开发（RESTful API / 认证授权 / Redis / 消息队列）、+数据库（SELECT+JOIN / 索引 / 事务 ACID / 表结构设计）、+开发工具与环境（Git 流程 / 分支合并 / Shell / Docker），共 12 篇新知识点与 3 条路线（3ae92af）
- **GitHub Pages 部署**（M2 托管定案）：`deploy.yml` push 即发布，项目页 base 由 CI 注入，sitemap.xml（59 URL）与 robots.txt 生成（6294fa6）
- Lighthouse 基线报告（`docs/qa/lighthouse-baseline.md`）与基线核对的四项 100 分（caaa1d7）

### 修复

- `@unhead/vue` 与 vite-ssg 内嵌版本不一致导致 head 注入静默失效（v3 → 对齐 v2.1.18）（26d4174）
- sitemap URL 计数把 join 后字符串长度当条目数；Windows Git Bash 下需 `MSYS_NO_PATHCONV=1` 本地验证 base 构建（6294fa6）

## [0.1.1] – 2026-11-22 · M1 收尾

### 新增

- robots.txt；Lighthouse 基线核验流程（caaa1d7）

### 修复（可访问性）

- 全站可见文字对比度：`--text-faint`（3.02–3.4:1）从可见文字移除，5 处改用 `--text-secondary`（≥4.5:1）；faint 仅保留给 placeholder 属性
- 页内目录触控目标 ≥24px（Lighthouse target-size）

### 验收

- 375px 移动端：7 个 P0 页面零横向溢出，抽屉导航功能验证通过；桌面 Lighthouse（首页/内容页）Perf · SEO · A11y · BP 全部 100，LCP 0.5s

## [0.1.0] – 2026-11-22 · M0/M1 MVP 🎉

### 新增

- **内容工程化**（F8）：`content/` 目录规范即内容模型；构建脚本完成 schema 校验、slug 唯一、引用完整性、外链检查，不过即构建失败；Markdown 构建期编译为 HTML（markdown-it + Shiki 自定义主题 `blueprint-draft`）；内容脚手架（lesson/course/path）（bff6ade）
- **前台应用**：Vue 3 + TS + Vite + Tailwind v4 + vite-ssg；蓝图制图设计系统（tokens 落地为 `@theme`）；P0 九页 + 404，46 个内容路由全量预渲染
- **学习闭环**（F1–F4、F7）：领域导航与找方向问答、路线图（依赖/分支/两布局）、课程与知识点内容、进度标记与多级汇总、打卡日历与 streak、本地档案、导出/导入（合并与覆盖）、清空二次确认、「仅存本设备」三档提示
- **设计规范**：`design/` 三层文档（tokens / components / pages ×12）与比选存档
- **CI**：内容校验 → 类型检查 → SSG 构建冒烟（`.github/workflows/ci.yml`）

### 已知限制

- 仅浅色主题（token 已语义化，深色为后续选项）；搜索/测验/错题本位于 0.2.0；无单元测试
