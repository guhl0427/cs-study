---
id: l-css-responsive-anim
slug: responsive-anim
title: 响应式与动效：一套代码适配所有屏幕
difficulty: 2
estMinutes: 80
tags: [CSS, 响应式]
summary: 移动优先写基础样式，min-width 媒体查询逐级增强；transition 让状态变化有过程，@keyframes 让元素自己动——落地页实战把两件事一次打通。
updated: 2026-11-22
resources:
  - id: r-webdev-responsive
    title: web.dev · Learn Design：响应式设计
    url: https://web.dev/learn/design
    type: doc
    difficulty: 2
    note: Google 官方响应式课程，媒体查询与视口讲得最系统。
  - id: r-mdn-transitions
    title: MDN · CSS 过渡
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_transitions/Using_CSS_transitions
    type: doc
    difficulty: 2
    note: transition 参数与触发机制的权威手册。
  - id: r-mdn-animations
    title: MDN · CSS 动画
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_animations/Using_CSS_animations
    type: doc
    difficulty: 2
    note: keyframes 语法参考，参数忘了就查。
---

> 一句话定义：响应式 = 用**移动优先**的基线样式加 **min-width 媒体查询**逐级增强；动效 = **transition** 管「状态变化的过渡」、**animation** 管「自主循环的表演」。

## 概念讲解

### 移动优先：先写最窄的样式

移动优先是一种**代码顺序策略**：把手机端样式写成默认样式，再用媒体查询「从窄到宽」逐级增强。反过来（桌面优先、max-width 层层缩小）的问题在于：手机要「关掉」桌面的浮夸样式，关比开难；而移动优先里每级查询只做**加法**，代码永远在生长而不是在拆。

```css
/* 基线：手机端（所有人先看到这一层） */
.intro { padding: 16px; }

/* 平板：640px 以上追加 */
@media (min-width: 640px) {
  .intro { padding: 32px; }
}

/* 桌面：1024px 以上再追加 */
@media (min-width: 1024px) {
  .intro { padding: 48px; }
}
```

为什么用 `min-width` 而不是 `max-width`？因为「不小于 640px」表达的是**增强条件**，语义与移动优先一致，且窄屏规则天然被宽屏继承，不用重复书写。

### viewport meta：手机不认识你没告诉它的规则

没有这行，手机浏览器会假装自己是 980px 宽的桌面浏览器，把页面缩小塞进屏幕——你的移动端布局等于白写：

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

`width=device-width` 让 CSS 像素等于设备宽度，`initial-scale=1` 禁止初始缩放。它是响应式的**入场券**，每个 HTML 都该有。

### 断点怎么选：跟着内容走，不是拍脑袋

主流设备的分界大致是：手机 <640px、平板 640~1023px、桌面 ≥1024px，但**断点的真正依据是内容**——当布局开始难看（文字行太长、卡片挤成三条腿）就加一个断点。经验流程：写完手机版 → 拉宽窗口 → 看到「难受」的位置 → 就在那里设断点。照抄一套断点数字而不看自己的内容，是响应式的典型教条主义。

### 相对单位：响应式的血液

| 单位 | 相对于谁 | 响应式直觉 |
| ---- | ---- | ---- |
| % | 父元素 | 宽度用 %，让容器跟随视口伸缩 |
| rem | html 根字号（默认 16px） | 字号与间距跟随根字号，整页一键缩放 |
| vw / vh | 视口宽/高的 1% | 横幅高度 100vh、大标题 font-size: clamp() 常客 |

上一课的 rem 在这里发力：用户调大浏览器默认字号、或你在断点里改 `html { font-size }`，所有 rem 字号和间距同步缩放——**px 是钉死的，rem 是活络的**。

### 三个必会的响应式模式

**① 等比缩放图片**（一行防溢出）：

```css
img { max-width: 100%; height: auto; }
```

图片天生有原始像素宽，容器比它窄时就会溢出撑破布局；`max-width: 100%` 让图片「最多占满容器、按比例缩高」。

**② Grid 单行声明换列数**：

```css
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;              /* 手机：单栏 */
}
@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); } /* 平板：两栏 */
}
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); } /* 桌面：三栏 */
}
```

或者用上一课的 `repeat(auto-fill, minmax(220px, 1fr))` 连媒体查询都省掉——两种写法都优于手写百分比。

**③ 汉堡菜单的显示切换**（思路一提）：手机端隐藏导航列表、只显示汉堡图标，宽屏反之：

```css
.burger { display: flex; }   /* 手机端显示汉堡 */
.menu   { display: none; }
@media (min-width: 768px) {
  .burger { display: none; }
  .menu   { display: flex; } /* 宽屏显示完整菜单 */
}
```

（真正的展开/收起需要一点 JS 切换类名，这里先记住「display 切换 + 媒体查询」的组合。）

### transition：状态变化的「过程补间」

`transition` 的本质：**当属性的值发生变化时，浏览器自动补上中间帧**。它不发起动画，只给「变化」配过程：

```css
.btn {
  background: #1b62a6;
  transition: background 0.3s ease, transform 0.2s ease;
  /*          过渡谁  多久   什么节奏 */
}

.btn:hover {
  background: #155288;
  transform: translateY(-2px); /* 悬停：变深 + 上浮 2px */
}
```

四个参数依次是：**属性名、时长、缓动函数（ease 默认；ease-out 先快后慢最顺手）、延迟**。记两个关键点：① 必须有「状态变化」才触发——通常是 `:hover`、`:focus`、类名切换；写在默认状态里，变化发生在伪类/新状态上。② 只能过渡「有中间值的属性」——颜色、尺寸、transform 可以，display 不行（它只有两个离散状态，没有中间帧；这就是三隐士里 display 不能过渡的原因）。

### transform：动效的主力三兄弟

```css
.card:hover {
  transform: scale(1.04);              /* 放大 4% */
  transform: translate(8px, -4px);     /* 平移：右 8px、上 4px */
  transform: rotate(6deg);             /* 旋转 */
  transform: scale(1.05) translateY(-4px); /* 组合：同时生效 */
}
```

transform 不占布局空间（上一课讲过），且由 GPU 加速，是动效的默认位移方式。悬停微交互的黄金公式：**scale(1.03) 或 translateY(-2px) + transition 0.2s + 阴影加深**——克制的一点点「浮起」，就是质感。

### animation + @keyframes：自主表演

transition 需要触发，animation 不需要——元素加载后自己动，还能循环：

```css
@keyframes breathe {
  0%   { box-shadow: 0 0 0 0 rgba(27, 98, 166, 0.4); }
  100% { box-shadow: 0 0 0 12px rgba(27, 98, 166, 0); }
}

.dot {
  animation: breathe 2s ease-out infinite; /* 名字 时长 节奏 次数 */
}
```

`@keyframes` 定义关键帧（0% 起点 → 100% 终点，可插中间帧），`animation` 引用并控制时长、次数（`infinite` 无限循环）、方向。呼吸灯、加载旋转、进入页面的淡入，都是这个模式。

**无障碍一句话**：动画对晕动症用户是负担，加一行——

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none; transition: none; }
}
```

用户系统开启「减弱动态效果」时，你的页面自动静止。

## 代码示例

主线任务：一个移动优先的落地页——手机单栏 → 平板两栏 → 桌面三栏，外加按钮悬停动效与横幅呼吸点。跟着做，全程拖动窗口验证。

**第 0 步：HTML（保存为 landing.html）——注意 viewport 行**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>移动优先落地页</title>
  <style>
    /* 样式逐步加进来 */
  </style>
</head>
<body>
  <header class="hero">
    <span class="dot"></span>
    <h1>学 CSS，从此排版不求人</h1>
    <p>移动优先 · 媒体查询 · 动效三件套</p>
    <a class="btn" href="#">立即开始</a>
  </header>
  <main class="features">
    <section class="feat">响应式布局</section>
    <section class="feat">交互动效</section>
    <section class="feat">设计直觉</section>
  </main>
</body>
</html>
```

**第 1 步：基线样式（这就是手机端的样子）**

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1f2328;
  background: #f2f4f7;
}

.hero {
  padding: 48px 24px;          /* 手机：较小的留白 */
  text-align: center;
  background: linear-gradient(160deg, #1b62a6, #4a9bd8);
  color: #fff;
}

.hero h1 { font-size: 1.75rem; margin: 12px 0; }   /* 手机：较小的标题 */
.hero p  { font-size: 0.95rem; margin: 0 0 24px; opacity: 0.9; }

.features {
  display: grid;
  grid-template-columns: 1fr;  /* 手机：单栏 */
  gap: 16px;
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.feat {
  padding: 28px 16px;
  background: #fff;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
```

此时在浏览器里把窗口压窄：内容舒适；但拉宽后横幅文字偏小、三个色块竖排撑满全宽——手机版完成，该增强了。

**第 2 步：平板断点（640px，两栏）**

```css
@media (min-width: 640px) {
  .hero    { padding: 64px 32px; }
  .hero h1 { font-size: 2.25rem; }              /* 标题升级 */
  .features { grid-template-columns: repeat(2, 1fr); padding: 32px; }
}
```

刷新拉宽到 640px 以上：两个色块并排、第三个独占一行，标题变大——只写了**增量**，手机样式全部继承。

**第 3 步：桌面断点（1024px，三栏）**

```css
@media (min-width: 1024px) {
  .hero     { padding: 96px 32px; }
  .hero h1  { font-size: 2.75rem; }
  .features { grid-template-columns: repeat(3, 1fr); padding: 48px; }
}
```

拉宽到 1024px 以上：三栏齐整、留白从容。三个断点加起来不到 15 行，因为基线承担了全部默认值——这就是移动优先的「代码永远做加法」。

**第 4 步：按钮悬停动效（transition + transform）**

```css
.btn {
  display: inline-block;
  padding: 12px 32px;
  background: #fff;
  color: #1b62a6;
  font-weight: 600;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.btn:hover {
  transform: translateY(-2px) scale(1.03);   /* 上浮 + 微放大 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25); /* 阴影加深：浮起感 */
}
```

鼠标悬停按钮：它平滑上浮并微放大、阴影变深——transition 把状态变化补成 0.2 秒的过程。试着把 transition 临时删掉：变化瞬间完成，生硬感立现，「有过程」就是动效的全部意义。

**第 5 步：横幅呼吸点（@keyframes）**

```css
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffd54a;
  animation: breathe 2s ease-out infinite;
}

@keyframes breathe {
  0%   { transform: scale(1);    opacity: 1; }
  50%  { transform: scale(1.6);  opacity: 0.5; }
  100% { transform: scale(1);    opacity: 1; }
}
```

刷新后：横幅标题上方一枚黄色圆点持续呼吸。它不需要 hover、不需要点击——animation 是自主循环的表演，与 transition 的「等待触发」形成互补。

**第 6 步：无障碍收尾**

```css
@media (prefers-reduced-motion: reduce) {
  .btn  { transition: none; }
  .dot  { animation: none; }
}
```

系统开启「减弱动态效果」的用户看到的是静止页面——动效是增强，不是必需品。

## 常见坑

1. **坑 1：手机上布局和桌面一样小**。症状：手机打开页面字小成一团。原因：忘了 `<meta name="viewport">`，浏览器按 980px 桌面模式渲染再缩小。修复：每个页面头部都加上 viewport 行。
2. **坑 2：transition 写在 :hover 上没反应（或移出时生硬）**。transition 应写在**默认状态**里——它描述「变化发生时如何过渡」；写在 :hover 上则移出鼠标时失去过渡。对照检查：过渡属性在基线，变化值在伪类。
3. **坑 3：transition: all 依赖泛滥**。`transition: all` 会连不想要的属性一起动（如颜色、布局），还可能导致性能问题。明确列出属性名 `transition: transform 0.2s, box-shadow 0.2s`。
4. **坑 4：图片撑破容器**。固定宽度图片比容器宽时溢出。修复：`img { max-width: 100%; height: auto; }` 写进全局基线。
5. **坑 5：用 margin/left 做动画卡顿**。margin、width、top 参与布局计算，每帧都触发重排。动效只用 transform 和 opacity——它们不占布局、GPU 加速，顺滑是天然的。

## 小练习

1. **断点实测**：把示例页面三栏断点改成 1200px，观察 1024~1199px 区间的观感，说一说「跟着内容选断点」和「死记 1024」的差别。
2. **rem 缩放实验**：在 1024px 断点里加 `html { font-size: 18px; }`，观察所有 rem 字号同步变大的效果——这就是根字号驱动的整页缩放。
3. **找错误**：同事的卡片写了 `.card:hover { transition: transform 0.3s; transform: scale(1.1); }`，悬停时却毫无过渡地跳变——指出 transition 该放哪，并解释为什么。
4. **综合排版任务**：做一个「定价页」：移动优先基线（三张价格卡单栏）→ 640px 两栏 → 1024px 三栏；每张卡 hover 时 translateY(-4px) + 阴影加深（transition 0.2s）；推荐卡的徽章用 @keyframes 呼吸灯；最后补上 prefers-reduced-motion 降级。要求全程只写增量媒体查询，无 max-width。
