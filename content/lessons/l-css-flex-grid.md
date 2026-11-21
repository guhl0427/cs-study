---
id: l-css-flex-grid
slug: flex-grid
title: Flex 与 Grid 布局
difficulty: 2
estMinutes: 50
tags: [CSS, 布局]
summary: Flex 管「一排怎么排」，Grid 管「整页怎么分格」——现代布局只用这两把刀，float 已经退出历史舞台。
updated: 2026-11-21
resources:
  - id: r-grid-guide
    title: A Complete Guide to Grid
    url: https://css-tricks.com/snippets/css/complete-guide-grid/
    type: doc
    difficulty: 2
    note: 最经典 Grid 速查图，属性忘了就翻它。
  - id: r-flex-game
    title: Flexbox Froggy
    url: https://flexboxfroggy.com/
    type: tool
    difficulty: 1
    note: 24 关玩完，Flex 主干属性基本就记住了。
---

> 一句话定义：Flex 把容器里的元素排成一维的行或列，Grid 把容器划成二维网格——前者管内容流，后者管页面骨架。

## 概念讲解

**选型口诀**：一维用 Flex，二维用 Grid。

- **Flex**：导航栏、按钮组、卡片内的横向排列、头像 + 文字对齐……凡是「一排东西怎么排」都用它。
- **Grid**：整页分栏、卡片墙（3 列 × n 行）、后台仪表盘……凡是「先画格子再填内容」都用它。

Flex 三步走：

1. 容器上 `display: flex`（从此子元素成为 flex 项，不再受 margin 塌陷困扰）；
2. 定主轴方向 `flex-direction`（row 行 / column 列）+ 对齐：主轴 `justify-content`，交叉轴 `align-items`；
3. 子元素弹性：`flex: 1`（均分剩余空间）、`flex: 0 0 200px`（固定 200px 不伸不缩）。

Grid 两步走：

1. 容器上 `display: grid` + `grid-template-columns` 定义列（如 `repeat(3, 1fr)` = 3 等分）；
2. `gap` 控制行列间距；子元素可用 `grid-column: span 2` 跨格。

`1fr` 是「按比例分剩余空间」，比百分比更聪明——它先扣除 gap 再分配，不会出现百分比加起来 100% 却换行的尴尬。

## 代码示例

经典「上导航 + 中内容 + 下页脚」布局，Grid 十行搞定：

```css
.page {
  display: grid;
  grid-template-rows: auto 1fr auto; /* 头/脚自适应，中间吃满剩余 */
  min-height: 100vh;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 三等分 */
  gap: 16px;
}

/* 窄屏时自动变单列，不需要写任何媒体查询 */
@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

.navbar {
  display: flex;
  justify-content: space-between; /* 两端对齐：logo 左，菜单右 */
  align-items: center;
}
```

```html
<div class="page">
  <nav class="navbar">
    <b>LOGO</b>
    <div class="nav-links">首页 · 领域 · 关于</div>
  </nav>
  <main class="cards">
    <div class="card">卡片 1</div>
    <div class="card">卡片 2</div>
    <div class="card">卡片 3</div>
  </main>
  <footer>页脚</footer>
</div>
```

## 常见坑

1. **坑 1：在 Flex 子元素上找 `justify-content`**。对齐属性只对**容器**生效，子元素上的 `justify-self` 在 Flex 里不存在。排查：确认样式写在 `display: flex` 的那一层。
2. **坑 2：`1fr` 与 `auto` 混排时的意外压缩**。`grid-template-columns: auto 1fr` 里，内容长的列会把另一列挤到最小。需要下限时写 `minmax(180px, 1fr)`。
3. **坑 3：还在用 float 排版**。float 的本职是「文字环绕图片」，用它布局是十年前的遗产。新代码禁止 float 布局（环绕场景除外）。

## 小练习

1. 用 Grid 搭一个「顶栏 + 侧栏 + 内容区 + 页脚」后台骨架（列：240px 1fr）。
2. 把示例卡片墙改成「能放几张放几张、每张最小 200px、自动换行」：提示 `repeat(auto-fill, minmax(200px, 1fr))`。
3. 用 Flex 实现一个消息气泡行：头像（40px 固定）+ 文字（占满剩余）+ 时间戳（贴右边）。
