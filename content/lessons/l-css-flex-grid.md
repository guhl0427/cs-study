---
id: l-css-flex-grid
slug: flex-grid
title: Flex 与 Grid：现代布局双引擎
difficulty: 1
estMinutes: 90
tags: [CSS, 布局]
summary: Flex 用「两根轴」解决一维排列，Grid 用「行列网格」解决二维切分——六个容器参数、三个子项参数加上 fr/auto-fill/minmax，覆盖 95% 的日常布局。
updated: 2026-11-22
resources:
  - id: r-flex-game
    title: Flexbox Froggy
    url: https://flexboxfroggy.com/
    type: tool
    difficulty: 1
    note: 24 关玩完，Flex 主轴/交叉轴属性基本形成肌肉记忆。
  - id: r-flex-guide
    title: CSS-Tricks · A Complete Guide to Flexbox
    url: https://css-tricks.com/snippets/css/complete-guide-flexbox/
    type: doc
    difficulty: 2
    note: 最经典的 Flex 速查图解，属性忘了就翻它。
  - id: r-grid-guide
    title: CSS-Tricks · A Complete Guide to Grid
    url: https://css-tricks.com/snippets/css/complete-guide-grid/
    type: doc
    difficulty: 2
    note: 同系列 Grid 版，行列概念忘了随时回来查。
---

> 一句话定义：Flex 用「两根轴」解决一维排列，Grid 用「行列网格」解决二维切分——现代布局只用这两把刀，float 已经退出历史舞台。

## 概念讲解

### 为什么 float 时代过去了

float 的本职是「文字环绕图片」（杂志排版效果），它从不该用来布局。老一代前端把它「误用」成布局工具，代价惨痛：必须手动清除浮动、子元素高度不齐、垂直居中几乎无解。Flex（2009）和全面落地的 Grid（2017）出现后，float 布局彻底成为历史——现在新代码里见到的 float，要么在做文字环绕，要么是祖传代码。

### Flex 的核心：两根轴决定方向思维

`display: flex` 之后，容器里出现**两根看不见的轴**，之后所有对齐属性都在回答「沿哪根轴、怎么排」：

```
主轴 →  项1  项2  项3   ← justify-content：沿主轴「怎么排」
交叉轴 ↓               ← align-items：沿交叉轴「怎么对齐」
```

心智模型一句话：**主轴 = 内容流动的方向，交叉轴 = 垂直于流动的方向**。`flex-direction: column` 时主轴转成竖直，`justify-content` 跟着管上下、`align-items` 管左右——很多「属性好像失灵」的困惑都源于忘了轴会转向。

### 容器六参数（写在 display: flex 的元素上）

| 参数 | 常用值 | 作用 |
| ---- | ---- | ---- |
| flex-direction | row（默认）/ column / row-reverse | 定主轴方向 |
| justify-content | flex-start / center / space-between / space-evenly | 主轴对齐 |
| align-items | stretch（默认）/ center / flex-start / flex-end | 交叉轴对齐 |
| flex-wrap | nowrap（默认）/ wrap | 换行开关：默认挤在一行 |
| gap | 16px / 8px 12px | 子项间距，行列都能设 |
| align-content | center / space-between | **多行**作为整体在交叉轴的分布（单行无效） |

记忆锚点：`justify-`（主轴）与 `align-`（交叉轴）两族；`space-between` 两端贴边中间均分，`space-evenly` 全部等距——选型只看「要不要贴边」。`gap` 是新标准：间距从此不用 margin 拼凑，Flex 与 Grid 通用。

### 子项三参数（写在 flex 子元素上）

```css
.item {
  flex-grow: 1;    /* 剩余空间按比例伸展 */
  flex-shrink: 1;  /* 空间不足按比例收缩 */
  flex-basis: 0;   /* 伸缩的基准尺寸 */
  order: -1;       /* 改变排列顺序（默认 0，越小越靠前） */
}
```

几乎所有场景都用简写：`flex: 1`（= 1 1 0，均分剩余空间）、`flex: none`（= 0 0 auto，固定不伸不缩按内容占位）、`flex: 0 0 200px`（固定 200px，侧栏/头像位专用）。`flex: 1` 的语义是「大家平分剩余空间」，`flex: none` 是「别动我」——一伸一缩之间，就有了一个不写任何计算的自适应系统。

### 经典布局推导

**导航栏**（logo 左、菜单右）：

```css
.nav {
  display: flex;
  justify-content: space-between; /* 两端顶死，中间自由 */
  align-items: center;            /* 垂直居中 */
  gap: 24px;
}
```

**卡片等分**（几张卡片一模一样宽）：

```css
.cards { display: flex; gap: 16px; }
.cards .card { flex: 1; }  /* 每张卡均分整行 */
```

**圣杯布局**（顶栏 + 中间三栏 + 页脚）：外层 column 管纵向（头/身/脚），内层 row 管横向（左/中/右）——**嵌套 Flex 用两条一维引擎拼出二维布局**：

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }
.main  { flex: 1; display: flex; }  /* 中段吃满剩余高度，内部横向三栏 */
.side-l { flex: 0 0 200px; }        /* 左侧栏固定 200px */
.content { flex: 1; }               /* 内容弹性伸展 */
.side-r { flex: 0 0 240px; }        /* 右侧栏固定 240px */
```

### Grid 的核心：先画格子，再填内容

`display: grid` 之后容器变成**画布**：先用 `grid-template-columns/rows` 定义轨道（列宽/行高），子元素自动按序入格：

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr); gap: 16px; /* 3 等分列 + 行列间距 */
}
```

`fr`（fraction，份）是「按比例分剩余空间」：`1fr 2fr` 就是 1:2 分。它比百分比聪明在——**先扣除 gap 再分配**，不会出现「三列 33.3% 加上 gap 就爆行」的尴尬。

**响应式网格一行搞定**——`repeat()` 的第一个参数用 `auto-fill`，让浏览器自己决定一行放几列：

```css
grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
/* 每列最小 220px：容器 700px 放 3 列，1000px 放 4 列，手机放 1 列 */
```

**不用写任何媒体查询**，容器宽度变化时列数自动增减——这是 Grid 对响应式最大的贡献。**跨格**则让子元素声明自己占几列几行：`grid-column: span 2`（横跨 2 列）、`grid-row: span 2`（纵跨 2 行）、`grid-column: 1 / -1`（从第 1 条线跨到最后一条 = 整行）。

### 选型口诀：一维用 Flex，二维用 Grid

- **Flex**：导航栏、按钮组、头像 + 文字对齐、卡片内部排列——凡是「一排/一列东西怎么排」；
- **Grid**：整页分栏、卡片墙、图片画廊、仪表盘——凡是「先画格子再填内容」；
- 判断法：想象去掉内容后，剩下的骨架是**一根条**还是**一张网**。条 → Flex，网 → Grid。两者常嵌套：Grid 搭骨架，卡片内部用 Flex 排内容。

## 代码示例

主线任务：图片画廊从「挤成一团」到「响应式网格」的完整改造。跟着做，每步都有肉眼可见的变化。

**第 0 步：原始 HTML（保存为 gallery.html）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>图片画廊改造</title>
  <style> /* 样式逐步加进来 */ </style>
</head>
<body>
  <header class="nav">
    <b class="logo">我的画廊</b>
    <ul class="menu">
      <li>首页</li><li>风景</li><li>人像</li><li>关于</li>
    </ul>
  </header>
  <main class="gallery">
    <figure class="ph">山 1</figure>
    <figure class="ph">山 2</figure>
    <figure class="ph">海 1</figure>
    <figure class="ph">海 2</figure>
    <figure class="ph">林 1</figure>
    <figure class="ph feature">城 1</figure>
  </main>
  <footer class="foot">
    <span>© 2026 我的画廊</span>
    <span>用 Flex 与 Grid 构建</span>
  </footer>
</body>
</html>
```

现在打开页面：菜单项紧贴 logo，六张「图」从上到下竖着堆满全宽——块级元素的默认宿命。

**第 1 步：Flex 治理导航栏**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

.nav {
  display: flex;                  /* 子元素变成一行排布 */
  justify-content: space-between; /* logo 靠左，菜单靠右 */
  align-items: center;            /* 垂直居中 */
  padding: 12px 24px;
  background: #1f2328;
  color: #fff;
}

.menu {
  display: flex;      /* 菜单本身也是 flex 容器 */
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 24px;          /* 菜单项间距，告别 margin 拼凑 */
}
```

刷新后：深色导航栏里 logo 与菜单各占一端，菜单项等距分布——`space-between` + 嵌套 flex 的标准套路。

**第 2 步：Grid 第一版——固定三列**

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 等分列 */
  gap: 16px;                             /* 行列间距统一 */
  padding: 24px;
}
.ph {
  margin: 0;                  /* 清掉 figure 默认边距 */
  height: 140px;
  background: linear-gradient(135deg, #8ec5fc, #e0c3fc);
  border-radius: 8px;
  display: grid;              /* 图块内部也用 grid 居中文字 */
  place-items: center;        /* 水平垂直居中，Grid 的对齐简写 */
  color: #fff;
  font-size: 20px;
}
```

刷新后：六个色块 3 列 × 2 行整齐排列，间距一致。注意 `place-items: center` 一行完成水平垂直居中——Flex 做同样的事要写两个属性。

**第 3 步：跨格——让「城市」占两列当头条**

```css
.feature {
  grid-column: span 2;   /* 横跨 2 列，视觉焦点 */
  height: 200px;
  background: linear-gradient(135deg, #f6d365, #fda085);
}
```

刷新后：最后一个图块横跨两列、更高更醒目——**格子是死的，跨格是活的**，杂志式排版全靠这一手。

**第 4 步：响应式网格——一行替换固定三列**

```css
.gallery {
  display: grid;
  /* 替换 repeat(3, 1fr)：每列最小 220px，放不下自动换行 */
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
```

刷新后拖动窗口宽度：宽屏 4 列、中屏 3 列、窄屏 1 列，全程**没有一行媒体查询**——把「几列」的决定权交给浏览器按容器宽度实时计算。

**第 5 步：圣杯式纵向骨架（Flex 收尾）**

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;     /* 页面至少占满一屏 */
}
.gallery { flex: 1; }    /* 中段吃满剩余高度 */
.foot {
  display: flex;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1f2328;
  color: #9ea7b3;
}
```

刷新后：内容不足一屏时页脚也贴在屏幕底部（而不是半空飘着）。纵向骨架 `body` 是 column Flex，横向导航和页脚是 row Flex，画廊是 Grid——**Grid 画格子，Flex 排条状物**，双引擎各司其职。

## 常见坑

1. **坑 1：把对齐属性写在子项上**。现象：`justify-content` 加在 `.ph` 上毫无反应。原因：对齐是**容器**属性，Flex 子项上不存在 `justify-self`（那是 Grid 的）。想在 Flex 里单独推某个子项，用 `margin-left: auto` 或改它的 `flex-grow`。
2. **坑 2：Flex 子项「不肯收缩」，内容一长就撑爆容器**。原因：子项默认 `min-width: auto`——内容最小宽度成了收缩下限。修复：给子项加 `min-width: 0`，长文本配合 `overflow: hidden` 或 `text-overflow: ellipsis`。
3. **坑 3：`flex-direction: column` 后 justify-content「失灵」**。不是失灵，是主轴转成了竖直——`justify-content` 现在管上下，`align-items` 管左右。排查：先问「主轴现在指向哪」，再选属性。
4. **坑 4：`1fr` 和 `auto` 混排，长内容列把邻居挤扁**。`grid-template-columns: auto 1fr` 中 auto 列按内容最大宽度扩展。需要「内容决定但有底线」时写 `minmax(180px, 1fr)`；纯等分别混入 auto。
5. **坑 5：还在用 float 排版**。float 的本职是文字环绕图片，用它布局需要 clearfix 且垂直居中无解。新代码一律 Flex/Grid；遇到 float 布局的祖传代码，重构时机就是现在。

## 小练习

1. **导航栏变体**：把示例导航改成「logo 和菜单都靠左、最右边多一个『登录』按钮」——提示：`margin-left: auto` 能把一个子项推到尽头。
2. **收缩实验**：三个卡片 `flex: 1`，让中间卡片塞进超长单词，先观察撑爆，再加 `min-width: 0` 验证恢复收缩。
3. **Grid 跨格排版**：画廊首图改成 `grid-column: 1 / -1`（整行头条）+ 高度 260px，其余图块正常入格，观察杂志感。
4. **综合布局任务**：搭一个「作品集」页面——顶栏 Flex（logo/导航/按钮），主体 Grid `repeat(auto-fill, minmax(240px, 1fr))` 卡片墙，第一张卡 `grid-column: span 2` 当自我介绍卡（内部用 Flex 排头像与文字），底部圣杯式页脚贴底。要求全程不写媒体查询，只靠 auto-fill 实现响应式。
