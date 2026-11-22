---
id: l-html-doc-structure
slug: doc-structure
title: 网页的骨架：文档结构与语义化标签
difficulty: 1
estMinutes: 75
tags: [HTML, 入门, 语义化]
summary: 逐行解剖 HTML 文档的固定骨架，建立语义化标签的心智模型，从零写出一张结构正确的个人介绍页。
updated: 2026-11-22
resources:
  - id: r-html-mdn
    title: MDN · HTML 基础
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML
    type: doc
    difficulty: 1
    note: 权威参考，本节讲心智模型，具体标签细节来这里查。
  - id: r-html-validator
    title: W3C Markup Validator
    url: https://validator.w3.org/
    type: tool
    difficulty: 1
    note: 把你写的页面丢进去检查，嵌套错误和不规范写法都会被揪出来。
  - id: r-html-devtools
    title: Chrome DevTools · 查看、修改 DOM
    url: https://developer.chrome.com/docs/devtools/dom
    type: doc
    difficulty: 1
    note: 学会 Elements 面板，任何网站的 HTML 都是免费教材。
---

> 一句话定义：HTML 是给内容「贴结构标签」的语言——它不负责好看，只负责告诉浏览器、读屏器和搜索引擎「这一块是什么」。

## 概念讲解

### HTML 是什么：结构，不是外观

先纠正一个新手预期：HTML 不是编程语言，没有 if、没有循环，它的全部工作就是**打标签**。用盖房子打比方，前端三件套分工是：

- **HTML 是承重墙**：决定有几个房间、门开在哪（结构）；
- **CSS 是装修**：刷漆、铺地板、调灯光（外观）；
- **JavaScript 是电器**：开灯、播音乐、感应开门（行为）。

本节只盖毛坯房。你会发现：只写 HTML 的页面「丑但能用」，而结构错了的页面「漂亮也白搭」——后面学 CSS 时，选择器挂靠的正是今天搭的这些结构。

### 固定骨架：逐行解剖

每份 HTML 文档都是同一副骨架。先看全貌，再一行行拆：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>页面标题</title>
    <link rel="stylesheet" href="style.css" />
    <script src="app.js" defer></script>
  </head>
  <body>
    <!-- 用户能看见的一切内容 -->
  </body>
</html>
```

head 与 body 的分工记一句话：**head 是档案室，body 是展厅**——观众只逛展厅，但每件展品的说明书都存在档案室里。

逐行说清「为什么」：

1. `<!DOCTYPE html>`——**不是标签，是声明**。少了它，浏览器切回十几年前的「怪异模式」渲染：盒模型尺寸算法整个变掉，你以后学 CSS 时会撞上一堆解释不了的怪现象。它是历史包袱，但一行都不能省。
2. `<html lang="zh-CN">`——根元素，全文档只有一个。`lang` 告诉读屏器用什么语言发音、告诉翻译工具这是中文页面。不写，读屏器可能用英文腔念中文。
3. `<meta charset="UTF-8" />`——声明文字编码。不写或存成别的编码，中文直接变「æµ‹è¯•」式乱码。UTF-8 能表达全世界几乎所有文字，写它准没错。
4. `<meta name="viewport" ...>`——告诉手机「页面宽度按设备宽度算」。不写，手机会假装这是 980px 宽的桌面页面再整体缩小，字小到要双指放大。
5. `<title>`——注意：**它不是页面里的大标题**！它显示在浏览器标签页、收藏夹和搜索结果里。页面里的大标题是 body 里的 `<h1>`。一个给「找网页的人」看，一个给「正在读网页的人」看。
6. `<link rel="stylesheet">`——引入外部 CSS 文件。样式独立成文件，多个页面才能共用同一套外观。
7. `<script src="..." defer>`——引入 JS。`defer` 的意思是「先下载，等 HTML 解析完再执行」，放在 head 里也不会卡住页面显示。
8. `<body>`——观众真正看到的一切，前面 7 行都是为它服务的。

### 语义化标签：body 里的「书架分区」

body 的内容像图书馆书架：先分大区（页头/正文/页脚），大区里再分架。HTML5 提供一组**语义化标签**充当书架标签：

| 标签 | 语义（这块是什么） | 何时用 | 何时别用 |
| ---- | ---- | ---- | ---- |
| `header` | 页头或某区块的头部 | 放 logo、站点名、主导航 | 只因想显示在顶部就到处用 |
| `nav` | 导航链接集合 | 站点主导航、文章目录 | 两三个不相干的链接 |
| `main` | 页面主内容 | 每页**有且只有一个** | 出现第二个 |
| `section` | 有标题的主题区块 | 「联系方式」「课程介绍」这类整块 | 没标题、纯为包一层样式 |
| `article` | 独立成篇、单独拿走也成立的内容 | 一篇博文、一条评论、一张商品卡 | 只是普通分组 |
| `aside` | 可剥离的附属内容 | 侧边栏、广告、相关阅读 | 核心正文 |
| `footer` | 页脚或区块尾部 | 版权、备案号、联系方式 | — |

正文里最常用的三个，单独说纪律：

| 标签 | 语义 | 关键纪律 |
| ---- | ---- | ---- |
| `h1`-`h6` | 六级标题，构成文档大纲 | 一页一个 h1；层级连续不跳级 |
| `p` | 一个段落 | 只装文本和行内元素 |
| `div` / `span` | 无语义的块级 / 行内容器 | 最后手段：别的都不合适才用 |

选容器时的决策顺序，背下来：

```text
这块内容……
├─ 独立成篇、能单独拿走吗？   → article
├─ 有标题的一组主题内容吗？   → section
├─ 是页头/页脚/导航/侧栏吗？  → header / footer / nav / aside
└─ 只是想帮 CSS 包一层？     → div（行内小包装用 span）
```

**为什么必须语义化？** 因为你的页面有三类「读者」根本不看颜色和字体：**读屏器**按语义标签朗读和跳转（「跳到下一篇 h2」这种功能全靠它）；**搜索引擎爬虫**给 h1 和语义区块更高的结构权重；**半年后的你自己**要能读懂代码。一句话：**标签本身就是信息**——语义化没有性能收益，但它是可访问性、SEO、可维护性的共同地基。

### 嵌套三大禁忌

标签可以嵌套，但有三条高压线：

1. **块级元素塞进 `<p>`**。p 里只允许文本和行内元素。写了 `<p>前言<h2>正文</h2></p>`，浏览器会把 p 自动提前闭合——你在 DevTools 里看到的 DOM 和源码对不上，样式全乱。
2. **`<a>` 套 `<a>`**。链接里不能再套链接，点击行为未定义，浏览器会强行拆成两个兄弟链接。
3. **无语义的 div 泛滥（div 汤）**。div 套 div 套 div，读屏器和爬虫眼里就是一锅粥。每写一个 div 前先过一遍上面的决策清单。

### 用 DevTools 看真实网站的结构

按 F12 打开开发者工具，切到 **Elements** 面板：左侧是 DOM 树（浏览器解析后的最终 HTML），点左上角箭头图标再去点页面上任何元素，可直达对应代码；双击文本还能就地修改，立即生效（只改你本地，刷新即还原）。

这是学 HTML 最快的路径：打开你常用的网站，看看它的 header 装了什么、main 怎么分块。别人的网页就是免费的教材。

## 代码示例

主线任务：**从零写出你的第一个网页——一张个人介绍页**。跟着做约 15 分钟。

### 第 0 步：建文件

新建文件夹 `my-page`，里面建两个空文件：`index.html` 和 `style.css`。把 `index.html` 拖进浏览器打开（先是一片白）。之后每写一步就保存、切浏览器按 F5——立即看到结果。

为什么叫 `index.html`：绝大多数服务器把 `index.html` 当作文件夹默认首页，养成习惯，以后部署不用改名。

### 第 1 步：先立骨架

把骨架抄进 `index.html`（逐行讲过，现在亲手写一遍）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>王小明 · 个人介绍</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body></body>
</html>
```

浏览器效果：页面一片白，但标签页上出现了「王小明 · 个人介绍」——title 生效了，body 还是空的。

为什么这么写：title 用「名字 + 用途」，它是搜索结果里的第一行；提前挂上 link，第 4 步写 CSS 立刻见效。

### 第 2 步：页头与导航

在空 `<body>` 里写页头：

```html
  <body>
    <header>
      <h1>王小明</h1>
      <p>热爱编程的大三学生</p>
      <nav>
        <a href="#about">关于我</a>
        <a href="#hobby">爱好</a>
        <a href="#contact">联系方式</a>
      </nav>
    </header>
  </body>
```

浏览器效果：顶部出现大字「王小明」、一行小字、三个蓝色可点击链接（暂时跳不动，锚点还没建）。

为什么这么写：header 包住「页头三件套」；h1 一页只有一个，用在最重要的名字上；`href="#about"` 是**锚点写法**，指向 id 为 `about` 的元素——第 3 步马上补上。

### 第 3 步：主内容分区

继续在 header 后面写 main：

```html
    <main>
      <section id="about">
        <h2>关于我</h2>
        <p>我是王小明，计算机专业大三学生。正在自学前端，目标是半年内做出第一个完整网站。</p>
      </section>

      <section id="hobby">
        <h2>爱好</h2>
        <p>写代码之外，我喜欢打羽毛球和拍照。</p>
      </section>

      <section id="contact">
        <h2>联系方式</h2>
        <p>邮箱：<a href="mailto:xiaoming@example.com">xiaoming@example.com</a></p>
      </section>
    </main>
```

浏览器效果：点导航「关于我」，页面直接滚到对应区块——锚点生效。三个区块各有一个 h2 和一段文字。

为什么这么写：每个 section 都带 `id` + `<h2>`，符合「section = 有标题的主题区块」的定义；`mailto:` 点击唤起邮件客户端。导航现在能跳了——这是 HTML 结构自带的免费功能，没写一行 JS。

### 第 4 步：页脚 + 第一份 CSS

在 main 后面补 footer，然后往 `style.css` 写：

```html
    <footer>
      <p>© 2026 王小明 · 用 HTML 手写</p>
    </footer>
```

```css
body {
  font-family: system-ui, sans-serif;
  max-width: 640px;
  margin: 0 auto;
}
```

浏览器效果：内容变成居中的一栏、限宽 640px、换成无衬线字体——立刻不像「裸 HTML」了。

为什么这么写：footer 放版权；`max-width` + `margin: 0 auto` 是最经典的居中一栏。注意结构（HTML）与外观（CSS）分离——就算删掉 CSS，页面结构依然完整。

### 最终结构图

```text
index.html
│
├── <head> 档案室
│     ├── meta charset / viewport
│     ├── title   「王小明 · 个人介绍」
│     └── link → style.css
│
└── <body> 展厅
      ├── header
      │     ├── h1   王小明
      │     ├── p    一句话简介
      │     └── nav  3 个锚点链接
      ├── main（一页仅一个）
      │     ├── section#about    h2 + p
      │     ├── section#hobby    h2 + p
      │     └── section#contact  h2 + p(mailto)
      └── footer
            └── p  版权行
```

## 常见坑

1. **坑 1：忘了 `<!DOCTYPE html>`**。现象：页面能显示，但学 CSS 后边距、盒尺寸全和预期不符。原因：浏览器退回怪异模式渲染。排查：它不报错、只悄悄变行为，所以第一行永远手写完整，新建文件先贴骨架。
2. **坑 2：`<h3>` 跳过 `<h2>` 当「小字标题」用**。现象：标题层级忽大忽小，大纲乱序。原因：把 h 标签当字号工具——实际读屏器和爬虫按 h1→h6 生成大纲。对策：想要小字用 CSS 改样式，标题层级必须连续。
3. **坑 3：`<p>` 里塞块级元素**。现象：源码嵌套没问题，Elements 面板里 p 却提前闭合、内容跑到外面。原因：p 不允许包含块级元素，浏览器自动修正。排查：布局诡异时先对比源码与 Elements 面板里的 DOM。
4. **坑 4：title 和 h1 混为一谈**。现象：页面大标题写进 title，body 里反而不写 h1；或两个都写「首页」。原因：没分清「给搜索结果看的名字」和「给读者看的大标题」。title 面向标签页与搜索结果，h1 面向读者，各一个。
5. **坑 5：div 汤**。现象：页面能看，但全由 div 套 div 组成，两周后自己都读不懂。对策：每次写容器先过决策清单——article → section → header/footer/nav/aside → div，逐级降级，实在不行才用 div。

## 小练习

1. 完整抄一遍示例并跑通；再把「爱好」区块改成列表（下一节正式学，先照葫芦画瓢：`<ul><li>羽毛球</li><li>拍照</li></ul>`），观察效果。
2. 用 F12 → Elements 面板打开一个你常用的网站，找到它的 header、main、footer，记下它们的直接子元素分别是什么标签。
3. 故意犯两个错再修复：把某个 `<h2>` 换成 `<div>` 看标题失去含义；往 `<p>` 里塞一个 `<div>`，到 Elements 面板找 DOM 结构的变化。
4. **综合任务**：给家人或朋友写一张介绍页（名字、一段介绍、三个带锚点导航的区块、页脚），保存为 `about.html`，提交到 W3C Validator 并清零全部报错——这是本节的验收标准。
