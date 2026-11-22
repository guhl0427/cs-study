---
id: l-css-text-color
slug: css-text-color
title: 文字、颜色与背景：页面的「化妆术」
difficulty: 1
estMinutes: 70
tags: [CSS, 基础]
summary: 颜色有四种写法、字号有三套单位、背景有三件套——掌握「深色标题 + 灰色正文 + 强调色徽章」这套配色推导，页面立刻从素脸变精致。
updated: 2026-11-22
resources:
  - id: r-webdev-color
    title: web.dev · Learn CSS：Colors
    url: https://web.dev/learn/css/colors
    type: doc
    difficulty: 1
    note: 官方颜色章节，hsl 的讲解配了可交互调色板。
  - id: r-mdn-fonts
    title: MDN · CSS 字体与文本
    url: https://developer.mozilla.org/zh-CN/docs/Learn/CSS/Styling_text
    type: doc
    difficulty: 1
    note: font-family 栈、line-height、字间距的权威参考。
  - id: r-mdn-gradient
    title: MDN · linear-gradient()
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/gradient/linear-gradient
    type: doc
    difficulty: 1
    note: 渐变函数的语法手册，参数忘了就翻。
---

> 一句话定义：页面「化妆」三板斧——颜色决定气质、字体决定易读、背景决定层次，本课教你把一张素卡片化出「深色标题 + 浅色正文 + 强调色徽章」的完整妆容。

## 概念讲解

### 颜色的四种写法

同一个颜色（一种偏蓝的青色）有四种表达方式，各自适合不同场景：

```css
color: steelblue;                /* 关键字：140 个预定义色，写原型够用 */
color: #4682b4;                  /* hex：#RRGGBB 十六进制，设计稿的主流格式 */
color: rgb(70, 130, 180);        /* rgb：红绿蓝三通道，各 0-255 */
color: hsl(207, 44%, 49%);       /* hsl：色相/饱和度/亮度 */
```

透明度靠第四个通道：`rgba(70, 130, 180, 0.5)` 或 `#4682b480`（hex 末尾追加两位）。

**为什么设计师偏爱 hsl？** 因为它的三个分量直接对应人眼的调色动作：色相（Hue）是「哪种颜色」（0° 红 → 120° 绿 → 240° 蓝，转一圈），饱和度（Saturation）是「多鲜艳」（100% 艳丽 → 0% 变灰），亮度（Lightness）是「多亮」（50% 正常 → 0% 黑 → 100% 白）。想要「蓝灰一点的 hover 态」，在 hsl 里只需把亮度从 49% 调到 40%、饱和度从 44% 降到 30%——数字即意图；换成 rgb 你得同时算三个通道的新值。工程上还有个好处：同一色相不同亮度的一组值（如 `hsl(210, 40%, 90%)` / `40%` / `20%`）天然和谐，是构建配色系统的捷径。

### 字体：font-family 栈与回退机制

`font-family` 不是「设置一个字体」，而是**给浏览器一份优先级清单**——从左到右找，找到系统里装了哪个就用哪个，全没装才用最后的通用族兜底：

```css
font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
/*             macOS 中文字体      Windows 中文字体     系统界面字体   无衬线兜底 */
```

这个「栈」是网页字体与桌面软件的根本差异：网页无法保证用户机器上有什么字体，所以中文项目几乎都写「苹方 → 雅黑 → 系统字体 → sans-serif」这样的栈。通用族只有五个：`serif`（衬线）、`sans-serif`（无衬线，中文正文主流）、`monospace`（等宽，代码专用）、`cursive`、`fantasy`，最后一个是必写的保底。

### 字号：px、rem、em 之争

| 单位 | 含义 | 什么时候用 |
| ---- | ---- | ---- |
| px | 固定像素，1px 就是 1px | 边框、阴影偏移这类「不许变」的细节 |
| rem | 相对**根元素** html 的字号（默认 16px） | 字号、间距的首选——全站一处调整 |
| em | 相对**自身**（或父元素）的字号 | 按当前文字比例的场合，如行高 1.5em |

rem 的关键在于它与 `html` 根字号的关系：`html { font-size: 16px }` 时 `1rem = 16px`，`0.875rem = 14px`，`1.25rem = 20px`。妙处在于：把根字号改小，**全站所有 rem 字号和间距同步缩放**——这正是响应式的伏笔（下一课展开）。px 的问题不是「错」，而是「僵」：用户在浏览器里调大默认字号，px 写死的文字纹丝不动，对视力弱的用户不友好；rem 跟随用户设置缩放，是无障碍的基本盘。

### 行高与字重：文字的立体感

- **line-height（行高）**：一行文字所占的垂直空间。`line-height: 1.6` 表示每行占字号 1.6 倍的高度，多余空间上下均分——这就是**行高垂直居中的直觉**：把 `height` 和 `line-height` 设成同一个值，单行文字就在容器里垂直居中了（如按钮 `height: 40px; line-height: 40px`）。正文建议 1.5~1.8，标题 1.2 左右；无单位的数字会**继承给子元素并按子元素自己的字号计算**，比写死 px 更稳。
- **font-weight（字重）**：400 常规、700 粗体（`bold` 等价）。标题用 600，正文 400，强调 500——三档足够，别从 100 到 900 全用上，多数字体只有 3~4 个真实字重，其余是浏览器算法加粗，效果发虚。

### 文本修饰三小件

```css
text-align: center;      /* 水平对齐：left / center / right / justify */
text-decoration: none;   /* 下划线控制：链接默认 underline，常去线 */
letter-spacing: 0.05em;  /* 字间距：大写英文标题、中文标题微调 */
```

`letter-spacing` 用相对单位按当前字号缩放，是「高级感」的隐形开关——全大写的英文标题配上 `0.1em` 立刻不像刚入门的作品。

### 背景三件套与渐变

```css
.banner {
  background-color: #1b62a6;                    /* ① 底色 */
  background-image: url("hero.jpg");            /* ② 图片 */
  background-size: cover;                       /* ③ 尺寸策略 */
  background-position: center;                  /* 定位（常与 cover 搭配） */
  background: linear-gradient(135deg, #1b62a6, #4a9bd8); /* 简写形式 */
}
```

`background-size` 两种策略的区别要记牢：

| 值 | 行为 | 风险 |
| ---- | ---- | ---- |
| cover | 图片**铺满**容器，可能裁掉边缘 | 主体可能被裁 |
| contain | 图片**完整显示**，可能留白边 | 容器两侧露底色 |

口诀：**cover 裁图保容器，contain 保图露容器**。横幅背景、卡片头图用 cover；logo、必须完整看到的图用 contain。

`linear-gradient(方向, 色1, 色2, ...)` 用两个以上的颜色生成渐变，是零成本提升设计感的手法——不需要图片文件，浏览器即时绘制，深色主题按钮、横幅底图全靠它。

### CSS 变量：一处定义，处处引用

```css
:root {
  --brand: #1b62a6;      /* 定义：两个连字符开头的自定义属性 */
  --text-main: #1f2328;
}

.btn { background: var(--brand); }  /* 引用：var() */
.link:hover { color: var(--brand); }
```

`:root` 指根元素，变量全页可用。改主题色时只改 `--brand` 一处，所有引用同步更新——这就是设计系统的雏形，也让「配色推导」从重复劳动变成填空题。

## 代码示例

主线任务：把一张「素卡片」调成有层级的成品卡片。跟着做，每步观察颜色和文字的变化。

**第 0 步：素卡片（保存为 card.html，CSS 内联在 style 标签里）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f2f4f7; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">新特性</span>
    <h3 class="card-title">CSS 变量入门</h3>
    <p class="card-text">一处定义颜色，处处引用更新，主题切换只需改一行。</p>
    <a class="card-link" href="#">阅读全文 →</a>
  </div>
</body>
</html>
```

现在的卡片：黑标题、黑正文、蓝链接挤在一起，徽章毫无特殊感——所有文字一个颜色，没有层级。

**第 1 步：先定义调色板（CSS 变量）**

```css
:root {
  --brand: hsl(210, 60%, 40%);     /* 主色：偏稳重的蓝 */
  --brand-soft: hsl(210, 80%, 92%);/* 主色的浅版：徽章底色 */
  --text-main: hsl(210, 20%, 15%); /* 标题：近黑但带一点蓝调 */
  --text-sub: hsl(210, 10%, 45%);  /* 正文：中灰 */
  --bg-card: #ffffff;
}
```

注意配色思路：标题和正文都是**同一色相（210°蓝）不同亮度/饱和度**的灰——同色系天然和谐，比随手抓几个颜色高级得多。这就是 hsl 的实战价值。

**第 2 步：给卡片塑形并应用文字层级**

```css
.card {
  width: 340px;
  margin: 40px auto;
  padding: 20px;
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-title {
  margin: 8px 0;
  font-size: 1.25rem;   /* 20px，随根字号缩放 */
  font-weight: 700;
  color: var(--text-main); /* 深色标题：视觉锚点 */
  line-height: 1.3;
}

.card-text {
  margin: 0;
  font-size: 0.875rem;  /* 14px */
  line-height: 1.7;     /* 正文行高放宽，长段落易读 */
  color: var(--text-sub); /* 浅灰正文：退到标题后面 */
}
```

刷新后：标题深黑醒目、正文灰色退后——「深色标题 + 浅色正文」是文字层级的第一法则：**越重要越深，越次要越浅**。

**第 3 步：强调色徽章（背景 + hsl 的浅色推导）**

```css
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;      /* 大圆角 = 胶囊形 */
  font-size: 0.75rem;        /* 12px，徽章要小 */
  font-weight: 600;
  color: var(--brand);       /* 文字用主色 */
  background: var(--brand-soft); /* 底色用主色的浅版 */
  letter-spacing: 0.05em;
}
```

刷新后：胶囊徽章浮现在标题上方。配方公式：**强调色文字 + 同色相高亮度的浅底**——`hsl(210, 60%, 40%)` 的文字配 `hsl(210, 80%, 92%)` 的底，同色相保证不突兀，高亮度底保证深色文字可读。

**第 4 步：链接与交互色**

```css
.card-link {
  display: inline-block;
  margin-top: 12px;
  font-size: 0.875rem;
  color: var(--brand);
  text-decoration: none;
  font-weight: 600;
}

.card-link:hover {
  text-decoration: underline;
}
```

刷新后：链接采用主色且加了字重，与灰色正文明显区分——**链接必须与正文有色差**，这是可读性底线。

**第 5 步：渐变横幅收尾（背景三件套实战）**

```html
<!-- 在卡片上方加一个横幅 -->
<header class="banner">
  <h2>CSS 配色工作坊</h2>
</header>
```

```css
.banner {
  padding: 48px 20px;
  text-align: center;                       /* 文字水平居中 */
  background-image: linear-gradient(135deg, var(--brand), hsl(210, 60%, 55%));
  /* 主色到主色亮版的对角渐变：同色相，绝不刺眼 */
  color: #fff;
}

.banner h2 {
  margin: 0;
  letter-spacing: 0.1em;  /* 大标题拉开字距 */
}
```

刷新后：页面顶部出现一条蓝色对角渐变横幅，白色大标题居中。到这里，完整妆容就位：渐变横幅定调 → 深色标题锚点 → 灰色正文退后 → 主色徽章与链接强调。试着把 `:root` 里的 `--brand` 改成 `hsl(160, 55%, 38%)`（绿色系），全页瞬间换主题——这就是变量 + hsl 组合拳的威力。

## 常见坑

1. **坑 1：中文网页用 `font-family: Arial`**。现象：中文回退到系统宋体或黑体，观感失控。原因：Arial 没有中文字形，浏览器自己找替身。修复：中文项目写全栈 `"PingFang SC", "Microsoft YaHei", sans-serif`，永远以通用族兜底。
2. **坑 2：背景图设了 `width: 100%` 却「变形或被裁」**。`background-size` 默认是 `auto`（原尺寸），必须显式声明：要铺满用 `cover`（裁边），要完整用 `contain`（露底）。搭配 `background-position: center` 让裁切从中间进行。
3. **坑 3：`height` 和内容对不上，文字偏上**。容器 `height: 40px` 但文字贴顶。原因：文字在「行框」里排，不自动垂直居中。修复：单行文字用 `line-height` 等于 `height`；多行内容改用 Flex（下一课讲）。
4. **坑 4：rgba 写成了 rgb 却期待半透明**。`rgb(70,130,180)` 不透明；透明度必须走第四通道 `rgba(70,130,180,0.5)` 或 hex 八位写法 `#4682b480`。看到「透明没生效」先检查是不是少了 alpha 通道。
5. **坑 5：变量名拼错，样式静默失效**。`color: var(--Brand)` 与 `--brand` 不是同一个变量——CSS 变量区分大小写，且拼错**不报错**，属性只是无效。排查：F12 → Computed 面板看该属性值是否显示为空或回退值。

## 小练习

1. **hsl 调色推演**：把 `hsl(210, 60%, 40%)` 分别推导为「hover 深一档」「浅底徽章版」，写出两个 hsl 值，再到浏览器里和原色并排对比验证。
2. **rem 换算**：根字号 16px 时，18px、14px、12px 分别是多少 rem？把根字号改成 20px 后，正文 `0.875rem` 变成多少 px？体会「一处改全站变」。
3. **找错误**：同事写的按钮 `height: 44px; line-height: 44px;` 里文字却贴着底部，他的 line-height 写的是 `44px solid`——指出问题并修复。
4. **综合排版任务**：做一张「课程推广卡」：顶部渐变横幅（linear-gradient，主色两档）+ 胶囊徽章「限时免费」+ 深色标题 + 灰色两行简介（line-height 1.7）+ 主色链接。要求：全部颜色通过 CSS 变量定义，且配色使用同一色相的 hsl 推导（色相自选），完成后把主色变量改一个值验证一键换肤。
