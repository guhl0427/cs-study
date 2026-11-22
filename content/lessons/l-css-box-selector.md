---
id: l-css-box-selector
slug: box-selector
title: 盒模型与选择器：CSS 的第一性原理
difficulty: 1
estMinutes: 85
tags: [CSS, 基础]
summary: CSS 只做两件事：用选择器命中元素，用盒模型决定它占多大地方——这两个模型吃透，再加一条层叠裁决规则，整个语言的地基就齐了。
updated: 2026-11-22
resources:
  - id: r-webdev-box
    title: web.dev · Learn CSS：盒模型
    url: https://web.dev/learn/css/box-model
    type: doc
    difficulty: 1
    note: Google 官方课程，盒模型图解比规范文档好读得多。
  - id: r-mdn-selectors
    title: MDN · CSS 选择器参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors
    type: doc
    difficulty: 1
    note: 全部选择器语法的权威手册，忘了就查。
  - id: r-css-diner
    title: CSS Diner（选择器游戏）
    url: https://flukeout.github.io/
    type: tool
    difficulty: 1
    note: 32 关练完，后代/子代/伪类选择器形成肌肉记忆。
---

> 一句话定义：CSS 的全部工作就是两步——**用选择器选中谁**、**用盒模型决定它占多大地方**，再由层叠规则裁决冲突，这就是这门语言的第一性原理。

## 概念讲解

**先建立心智模型**。浏览器拿到 HTML 后：先把标签解析成 DOM 树，再逐条读入 CSS 规则（每条规则 = 选择器 + 一组声明），拿着选择器去树上问「谁匹配」，匹配到的元素就套上这组声明；多条规则改同一个属性时，由**层叠**规则裁决出唯一赢家。所以学 CSS 就是学三样：**选择器**（怎么选中谁）、**盒模型**（元素占多大地方）、**层叠**（冲突时听谁的）。

### 把 CSS 装进页面：三种引入方式

```css
/* 方式一：内联样式 */  <div style="color: red">紧急通知</div>
/* 方式二：内部样式 */  <style> .warn { color: red; } </style>
/* 方式三：外部样式表 */ <link rel="stylesheet" href="style.css">
```

三者可以共存，优先级：**内联样式 > 内部/外部样式表**；内部和外部平级，谁在 HTML 里出现得晚谁赢。实战几乎只用方式三：样式与结构分离、多页面复用、浏览器还能缓存它。内联样式只留给极少数「一次性的例外」，`<style>` 标签多见于单页 demo 和组件化框架。

### 盒模型：每个元素都是一个四层盒子

浏览器眼里，页面上的每个元素都是一个矩形盒子，从里到外四层，像洋葱：

```
┌────────────────────────── margin（外边距：透明，撑开与邻居的距离）
│ ┌──────────────────────── border（边框：可见的线）
│ │ ┌────────────────────── padding（内边距：透明，内容与边框间的呼吸感）
│ │ │   content（内容：文字、图片真正的家）
```

为什么这么设计？因为「内容多大」和「留白多大」是两个独立的决定：文字量由内容决定，而呼吸感、边界感、与邻居的距离是排版意图，分开控制才灵活。四层各自对应的属性：

| 层 | 控制属性 | 特性 |
| ---- | ---- | ---- |
| content | width / height | 默认只指内容大小 |
| padding | padding（上右下左） | 撑大盒子，背景色能延伸到这里 |
| border | border: 1px solid #ccc | 占地方，算进盒子尺寸 |
| margin | margin: 16px | 透明区域，推开别人，不含背景 |

`padding` 和 `margin` 都支持 1~4 个值的简写：`padding: 10px` 四边相同；`padding: 10px 20px` 上下 10、左右 20；`padding: 10px 20px 30px 40px` 按**上右下左**顺时针（记「从十二点开始转圈」）。

### box-sizing：width 到底指哪一层？

默认规则 `box-sizing: content-box` 下，`width: 200px` 只管**内容层**，加上 padding 和 border 后实际占用更宽——数学上没错，直觉上反人类：

```
content-box:  200 + 12*2(padding) + 1*2(border) = 实际占 226px
border-box:   width: 200 = 整个盒子就是 200px，内容自动缩到 174px
```

于是现代 CSS 的第一行几乎都是：

```css
* { box-sizing: border-box; } /* width/height 从此指「整个盒子」 */
```

`*` 是通配选择器，命中所有元素。设了这行以后，`width: 50%` 的两列无论加多少 padding 和 border 都还是 50%，不会互相挤爆换行。这就是它是「现代默认」的原因：让 width 的语义与人脑直觉对齐，布局算术从「做减法」变成「所见即所得」。

### margin 折叠：两个间距合并成一个

垂直方向上相邻的两段 margin 会**合并取较大值**，这叫 margin 折叠：

```
A 的 margin-bottom: 20px
B 的 margin-top:    30px
实际 A、B 之间的间距 = 30px（不是 50px）
```

为什么浏览器这么设计？源自印刷排版：段落 A 设了下间距、段落 B 设了上间距，视觉上取一个大间距才自然，翻倍会难看。折叠还有第二种形态：父元素没有 padding/border 隔开时，**第一个子元素的 margin-top 会「漏」到父元素外面**，看起来像样式失效。应对：布局间距优先用 Flex/Grid 的 `gap`（不折叠）；需要隔断时给父元素 `display: flow-root`。

### 选择器系统课：从粗到细的八种武器

| 选择器 | 写法示例 | 命中谁 | 使用场景 |
| ---- | ---- | ---- | ---- |
| 元素选择器 | `p { }` | 所有 `<p>` | 全局基线样式 |
| 类选择器 | `.card { }` | class 含 card 的元素 | **日常主力，90% 场景** |
| ID 选择器 | `#login { }` | id 为 login 的元素（页面唯一） | 少用——太特异，难覆盖 |
| 后代选择器 | `.card p { }` | .card 里所有层级的 p | 限定容器内 |
| 子代选择器 | `.card > p { }` | .card **直接**子级 p | 防止误伤孙子辈 |
| 群组选择器 | `h1, h2, h3 { }` | 逗号并列，一次命中多种 | 统一标题样式 |
| 伪类选择器 | `.btn:hover { }` | 特定状态（悬停/聚焦） | 交互反馈必备 |
| 属性选择器 | `input[type="text"] { }` | 属性满足条件的元素 | 表单、链接场景 |

伪类是最值得先掌握的一类，交互感全靠它：

```css
.btn:hover  { background: #1b62a6; }        /* 鼠标悬停 */
.btn:focus  { outline: 2px solid #f60; }    /* 键盘聚焦 */
.btn:active { transform: translateY(1px); } /* 按下瞬间 */
```

`:hover` 负责「我指到你了」，`:focus` 负责「我选中你了」——后者对只用键盘的用户是唯一的定位手段，任何可交互元素都别裸奔。

### 层叠：冲突时听谁的

同名属性撞车时，浏览器按三层裁决：

1. **来源优先级**：内联样式 > 作者样式表（你写的）> 浏览器默认样式。`h1` 自带的大字号、`body` 自带的 8px 边距，都属于最低级的默认样式。
2. **特异性**：按选择器「精确度」算一个三元组分数 `(id, 类, 元素)`——ID 在第一格记 1，类/伪类/属性选择器在第二格记 1，元素在第三格记 1；从左到右比大小，左边大者胜（分数完全相同时，后写的赢）。`!important` 是最高豁免，只在覆盖第三方库时偶尔用。

推演练习：「两个类谁赢」——`.intro { color: blue; }` 得 (0,1,0)，`.intro.bold { color: red; }` 得 (0,2,0)，同时命中的元素最终是**红色**（两个类记 2 格，比单类高）。再推演一个：`#app .title` 得 (1,1,0)，`.card .title:hover` 得 (0,3,0)——一个 ID 抵消后面所有类，**前者赢**。这就是「别用 ID 写样式」的数学原因：一旦用了，后面想覆盖只能再上 ID 或 `!important`，恶性循环。

**继承**是层叠的温柔补充：`color`、`font-family`、`font-size`、`line-height`、`text-align` 等文本类属性会自动传给子元素——所以 `body { font-family: ... }` 一处设置全页生效；而 `margin`、`padding`、`border`、`width` 等盒模型属性不继承（子元素的边界本该独立）。拿不准时，开发者工具 Computed 面板会标明每个值是「直接命中」还是「继承而来」。

排查口诀：**样式没生效，先开 F12 → Styles 面板**——规则被划掉 = 被覆盖；面板里根本没出现 = 选择器没命中；值旁边标 "inherited" = 从父元素继承。

## 代码示例

主线任务：一个卡片组件从裸 HTML 到成品。跟着做，每一步都能在浏览器里看到明确变化。

**第 0 步：裸 HTML（保存为 card.html）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>卡片组件推导</title>
  <link rel="stylesheet" href="card.css"> <!-- 外部样式表 -->
</head>
<body>
  <div class="card">
    <h3 class="card-title">盒模型是什么</h3>
    <p class="card-text">每个元素都是四层盒子：内容、内边距、边框、外边距。</p>
    <a class="card-link" href="#">阅读全文</a>
  </div>
  <div class="card">
    <h3 class="card-title">选择器是什么</h3>
    <p class="card-text">用类、后代、伪类精确命中元素。</p>
    <a class="card-link" href="#">阅读全文</a>
  </div>
</body>
</html>
```

此时打开页面：内容挤成一坨，文字贴着浏览器边缘，两张卡片上下紧挨——这是浏览器默认样式的锅（body 自带 8px margin，标题自带大字号）。

**第 1 步：全局基建（card.css）——先立规矩**

```css
* {
  box-sizing: border-box; /* 从此 width 指整个盒子 */
}
body {
  margin: 0;              /* 干掉默认 8px 边距，自己掌控 */
  font-family: system-ui, sans-serif;
  background: #f2f4f7;    /* 浅灰底，衬托白色卡片 */
}
```

刷新后：页面边缘干净了，整体变浅灰。这是所有项目的标准开局，先于一切组件样式。

**第 2 步：用盒模型给卡片塑形**

```css
.card {
  width: 320px;        /* border-box：整个盒子 320px 宽 */
  background: #fff;
  padding: 16px;       /* 内容四周留白，文字不再贴边 */
  border: 1px solid #d0d7de;
  border-radius: 8px;  /* 圆角，观感柔和 */
  margin: 16px auto;   /* 上下 16px；水平 auto = 居中 */
}
```

刷新后：白色卡片居中，文字四周有了呼吸感。`margin: auto` 是水平居中的经典手法——浏览器把剩余空间平分给左右两边。

**第 3 步：后代选择器整理卡片内部**

```css
.card-title {
  margin: 0 0 8px;    /* 清掉标题默认外边距，只留下 8px */
  font-size: 18px;
}
.card-text {
  margin: 0 0 12px;
  color: #57606a;     /* 灰色正文，形成层级 */
}
.card-link {
  display: inline-block; /* 行内元素也能吃 padding */
  color: #1b62a6;
  text-decoration: none; /* 去掉链接默认下划线 */
}
```

刷新后：标题与正文间距统一，正文变灰——同一张卡片里，重要的黑、次要的灰，层级出来了。

**第 4 步：伪类加交互反馈**

```css
.card-link:hover {
  text-decoration: underline;  /* 悬停出现下划线 */
}
.card-link:focus {
  outline: 2px solid #f60;     /* 键盘聚焦的可见描边 */
  border-radius: 2px;
}
.card:hover {
  border-color: #1b62a6;       /* 悬停时边框变色 */
  box-shadow: 0 4px 12px rgba(27, 98, 166, 0.15); /* 浮起感 */
}
```

刷新后：鼠标扫过链接出现下划线，扫过整张卡片微微「浮起」——盒子还是那个盒子，交互让页面活了起来。

**第 5 步：属性选择器 + 特异性实战**

```html
<!-- 把第二张卡片的链接改成新窗口打开 -->
<a class="card-link" href="#" target="_blank">新窗口打开</a>
```

```css
/* 属性选择器：命中所有新窗口链接，追加箭头 */
a[target="_blank"]::after {
  content: " ↗";
}
/* 特异性推演：这条 (0,1,1) 会赢过第 3 步的 .card-text (0,1,0) */
p.card-text {
  color: #1f2328;
}
```

刷新后：带 target 的链接尾部多了箭头；两段正文颜色变深——`p.card-text` 的分数 (0,1,1) 高于 `.card-text` 的 (0,1,0)。F12 → Styles 面板里能看到旧规则被划掉的过程，这就是层叠裁决的现场。

## 常见坑

1. **坑 1：「样式写了却没生效」——九成是层叠问题**。排查三步：F12 → Styles 看规则是否被划掉（被更高特异性覆盖）；看选择器是否命中（没命中，查类名拼写与层级）；看值旁是否标 inherited（从父元素继承来的）。
2. **坑 2：两列各 50%，加个边框就换行**。原因：默认 content-box 下 width 不含 padding/border，实际宽度超出。修复：全局 `* { box-sizing: border-box }`，一行根治。
3. **坑 3：margin「莫名其妙消失」**。现象：子元素的 margin-top 跑到父元素外面，或相邻元素的上下 margin 合并成一个。这是 margin 折叠，不是 bug。应对：内部间距用 padding，布局间距用 `gap`，需要隔断时给父元素 `display: flow-root`。
4. **坑 4：给 span 设宽高、上下 margin 没反应**。行内元素的宽高和上下 margin 被规范忽略。修复：`display: inline-block`（并排且可塑形）或 `display: block`。
5. **坑 5：用 ID 写样式后覆盖不动**。ID 的 (1,0,0) 压倒所有类，后续只能 ID 对 ID 或上 `!important`。规范：样式一律用类，ID 留给锚点跳转和 JS 取元素。

## 小练习

1. **盒模型手算**：`width: 200px; padding: 10px 20px; border: 2px` 的盒子，content-box 与 border-box 下实际各占多宽？先手算再开浏览器验证（content-box 应为 244px）。
2. **特异性推演**：`#app .title`、`.card .title:hover`、`h3.card-title` 同时命中同一元素，谁的颜色说了算？写出三个选择器的三元组分数再比对。
3. **找错误**：同事抱怨「卡片内 p 的 margin-top 设了 20px 却看不到效果」，而卡片本身设了 `padding: 16px`。是真的没效果吗？用 Computed 面板验证你的判断。
4. **综合排版任务**：仿照主线示例做一个「用户名片」卡片：头像区（背景色块代替图片）、姓名（深色大字）、简介（灰色小字）、一个带反馈的「关注」按钮。要求：全局 border-box；卡片 280px 居中；按钮有 `:hover` 变色与 `:focus` 描边两种状态；用属性选择器 `a[role="button"]` 命中按钮。
