---
id: l-css-box-selector
slug: box-selector
title: 盒模型与选择器
difficulty: 1
estMinutes: 45
tags: [CSS, 布局]
summary: 一切元素都是盒子，一切样式都靠选择器命中——这两个模型搞懂了，CSS 就有了主线。
updated: 2026-11-21
resources:
  - id: r-css-mdn
    title: MDN · CSS 布局入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn/CSS
    type: doc
    difficulty: 1
    note: 系统过一遍盒模型与选择器语法。
  - id: r-css-game
    title: Flexbox Froggy / CSS Diner
    url: https://flexboxfroggy.com/
    type: tool
    difficulty: 1
    note: 游戏化练习，选择器（CSS Diner）与 Flex 布局各玩一小时胜过看三小时文档。
---

> 一句话定义：CSS 做的事只有两件——用**选择器**选中元素，用**盒模型**决定它占多大地方。

## 概念讲解

**盒模型**：浏览器眼里每个元素都是一个「四层盒子」，从内到外：

```
┌─────────── margin（外边距：和别人的距离）
│ ┌───────── border（边框）
│ │ ┌─────── padding（内边距：内容和自己边框的距离）
│ │ │  content（内容）
```

必须开局就设这一行：

```css
* {
  box-sizing: border-box;
}
```

默认值 `content-box` 下，`width: 100px` 指的是**内容**宽，加了 padding 和 border 后盒子实际更宽——布局全线崩坏。`border-box` 让 `width` 直接等于**整个盒子**的宽，符合直觉。几乎所有现代项目的第一行 CSS 都是它。

**选择器**：按「命中精确度」从弱到强：

| 选择器 | 示例 | 什么时候用 |
| ---- | ---- | ---- |
| 标签选择器 | `p {}` | 全局基础样式 |
| 类选择器 | `.card {}` | **日常主力**（90% 场景） |
| 后代选择器 | `.card .title {}` | 限定在某容器内 |
| 伪类 | `.card:hover {}` | 状态（悬停/聚焦/选中） |
| ID 选择器 | `#app {}` | 少用——太特异，难覆盖 |

多个规则命中同一元素时，谁赢？这就是**层叠与优先级**：内联样式 > ID > 类 > 标签；同优先级时后写的赢。新手大坑「样式写上去没生效」，十有八九是被更高优先级的规则覆盖了——用开发者工具的 Styles 面板看谁在起作用。

## 代码示例

用类选择器 + 盒模型做一个卡片：

```html
<div class="card">
  <h3 class="card-title">盒模型演示</h3>
  <p class="card-body">width: 200px 是整个盒子的宽度。</p>
</div>
```

```css
* {
  box-sizing: border-box;
}

.card {
  width: 200px;        /* border-box 下 = 边框到边框的总宽 */
  padding: 12px;       /* 内边距挤在内容四周 */
  border: 1px solid #7fa2bc;
  margin-bottom: 16px; /* 和下一个元素的间距 */
}

.card-title {
  margin-top: 0;       /* 标题贴住卡片顶部 */
}

.card:hover {
  border-color: #1b62a6; /* 悬停反馈 */
}
```

开发者工具（F12 → Computed 标签）里能看到某个元素完整的盒模型分解图，调间距时打开它对照。

## 常见坑

1. **坑 1：不设 `border-box` 就开始布局**。症状：明明算好两列各 50%，加个边框就换行了。排查：永远第一行先写全局 `box-sizing`。
2. **坑 2：margin 不生效/塌陷**。相邻元素上下 margin 会**合并**取较大值；父子之间第一个子元素的 margin-top 会「漏」到父元素外面。排查：改用 padding 或给父元素加 `overflow: hidden` / `display: flow-root`。
3. **坑 3：用 ID 选择器写样式**。ID 优先级太高，后面想覆盖只能上 `!important` 恶性循环。日常用类，ID 留给锚点和 JS 定位。

## 小练习

1. 复现示例卡片，然后把 `padding` 改成 `12px 20px`（上下 12、左右 20），观察效果，说明为什么总宽没变。
2. 用开发者工具找到页面里任意元素的盒模型分解图，截图并标注 margin/border/padding。
3. 不查资料，手写：选中「class 为 card 的元素内部、所有 p 标签」的选择器。
