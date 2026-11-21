# Lighthouse 基线报告

> 验收标准（需求 §1.5 / §5）：核心内容页 Performance ≥ 90、SEO ≥ 95；首屏加载 ≤ 1.5s（常规宽带）。

| 项 | 值 |
| ---- | ---- |
| 测量日期 | 2026-11-22 |
| Lighthouse | v13.6.0 · `--preset=desktop` · headless Chrome |
| 被测 | 本地生产构建（vite-ssg 产物，`vite preview`） |

## 结果（修复后）

| 页面 | Performance | SEO | Accessibility | Best Practices | LCP |
| ---- | ---- | ---- | ---- | ---- | ---- |
| `/`（首页） | 100 | 100 | 100 | 100 | 0.5s |
| `/course/web-frontend-basics/lesson/promise-async`（内容页） | 100 | 100 | 100 | 100 | — |

首屏指标（首页）：FCP 0.4s · LCP 0.5s · TBT 0ms · Speed Index 0.4s —— 远优于 ≤1.5s 目标。

## 基线修复记录（首轮 91/95 → 100）

| 问题 | 修复 |
| ---- | ---- |
| robots.txt 缺失（SEO） | 新增 `frontend/public/robots.txt` |
| 搜索框占位文字对比度 3.02:1（A11y，`--text-faint` 用于可见文字） | 全站可见文字 `ink-3 → ink-2`（5 处：搜索框、路线节点符号、横向箭头、未开始徽标、课程行符号）；`ink-3` 此后仅用于 placeholder 属性 |
| 页内目录触控目标 17.9px < 24px（A11y） | TocPanel 链接加 `py-1.5` |

## 复测注意事项

- `.lighthouse/` 报告不入库（gitignore），需要复跑：`npx lighthouse <url> --preset=desktop --output=json --output-path=frontend/.lighthouse/<名> --chrome-flags="--headless=new"`
- 移动端 preset（模拟 375px 慢速网络）尚未纳入基线，M2 部署后补测
- 当前为本地预览环境；部署到 CDN 后需复测（首屏指标预期进一步改善）
