---
id: l-html-text-tables
slug: text-tables
title: 文本、链接、图片与表格
difficulty: 1
estMinutes: 70
tags: [HTML, 入门, 文本, 表格]
summary: 掌握标题层级、语义强调、三种列表、超链接路径、图片必填项与表格结构，给个人介绍页加上经历时间线和作品集。
updated: 2026-11-22
resources:
  - id: r-html-mdn-text
    title: MDN · HTML 文本处理基础
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Introduction_to_HTML/HTML_text_fundamentals
    type: doc
    difficulty: 1
    note: 文本与列表的权威讲解，本节的延伸阅读。
  - id: r-html-mdn-img
    title: MDN · HTML 中的图像
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Multimedia_and_embedding/Images_in_HTML
    type: doc
    difficulty: 1
    note: alt、宽高、懒加载等图片属性的完整参考。
  - id: r-html-mdn-tables
    title: MDN · HTML 表格基础
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Tables/Basics
    type: doc
    difficulty: 1
    note: 跨行跨列等进阶细节在这里查。
---

> 一句话定义：网页九成内容由文本、链接、图片和表格组成——每个标签都有岗位职责，用错了读者未必发现，读屏器和爬虫一定发现。

## 概念讲解

### 文本层次：标题是骨架，段落是肉

**h1-h6 是文档大纲**，不是字号按钮。把页面想成一本书：h1 是书名，h2 是章，h3 是节。纪律两条：一页只有一个 h1（书名不出现两次）；层级连续不跳级（第 2 章下面是 2.1 节，不是直接跳 2.1.1）。标题写得好，读屏器用户按标题键就能像翻目录一样跳读——标题乱，等于目录乱。

**p 是段落**。每段文字包进自己的 p，浏览器会自动留出段间距；视觉上「空一行」靠 CSS，不靠多打几个 p 或 `<br>`。

**strong/em 与 b/i 的语义差别**是本节最容易忽略的知识点：

| 标签 | 语义 | 读屏器怎么对待 |
| ---- | ---- | ---- |
| `strong` | 重要、紧急的内容 | 变调重读 |
| `em` | 语气重音（emphasis） | 变调朗读 |
| `b` | 视觉加粗，无语义 | 正常朗读，毫无反应 |
| `i` | 视觉斜体，无语义 | 正常朗读 |

什么时候 b/i 还有用：书籍名、外文惯用语、术语首现（出版排版习惯用斜体）。除此之外，**想强调就用 strong/em**——同样加粗，strong 连机器都骗不过，b 只骗得到眼睛。

**br 与 hr 要节制**：

- `br` 是强制换行，只用于「回车本身就是内容」的场景：诗歌分行、邮寄地址。段落之间换行用 p，别拿 br 排版——br 排出来的「段落」没有段落语义，读屏器一气念到底。
- `hr` 是主题转换（thematic break）：比如文章从「经历」切换到「结语」。它不是「画条线装饰一下」的工具——线条可以用 CSS 边框画，语义转换才用 hr。

### 列表：三种清单三种用途

| 标签 | 语义 | 典型场景 |
| ---- | ---- | ---- |
| `ul` | 无序清单 | 购物清单、功能点 |
| `ol` | 有序步骤 | 菜谱步骤、排行榜、时间线 |
| `dl` | 术语-描述对 | 术语表、FAQ |

嵌套规则：`li` 里可以再放 ul/ol/p 形成多级清单；dl 的结构是 `dt`（术语）+ `dd`（描述）成对出现。

选型一句话：顺序有意义用 ol（打乱顺序就出错），顺序无意义用 ul（打乱无所谓），一条配一条解释用 dl。

### 超链接：href 里的路径学

`<a href="...">` 是 HTML 的灵魂——「超文本」的超就超在这里。href 写什么分四种：

| 写法 | 叫什么 | 例子 |
| ---- | ---- | ---- |
| 完整 URL | 绝对路径 | `https://github.com/xiaoming` |
| 相对当前文件 | 相对路径 | `./about.html`、`../images/a.png` |
| 页内 id | 锚点 | `#contact` |
| 协议开头的特殊链接 | 伪协议 | `mailto:x@y.com`、`tel:13800000000` |

相对路径的理解方法：**站在当前 HTML 文件的位置找路**。`./` 是本文件夹，`../` 是上一级。绝对路径永远从域名出发，适合链接别人的站；站内链接用相对路径——以后整个文件夹搬家，链接照样能用。

**`target="_blank"` 必须配 `rel="noopener noreferrer"`**。原因是个安全漏洞：用 target=_blank 打开的新页面，可以通过 `window.opener` 拿到你原页面的控制权（改地址、换内容，叫 reverse tabnabbing）。加上 rel 就把这条通道掐断。有的浏览器新版本已默认隔离，但写上是零成本的好习惯。

下载链接用 `download` 属性：`<a href="resume.pdf" download>下载简历</a>`，浏览器会直接下载而不是尝试打开。

### 图片：img 的必填项与体贴属性

`<img src="..." alt="...">` 两个属性都算必填，理由各不相同：

- `src` 是图片来源，没有它图都不存在，不解释。
- `alt` 是图片的**文字替身**，三个用途：图挂了/加载中时占位显示；读屏器朗读给视障用户；爬虫靠它理解图片内容。写 alt 的口诀：**描述内容与作用，不是类型**——「2026 年学习时长柱状图」合格，「图片」「photo.jpg」不合格。

alt 有个特殊值：**空字符串 `alt=""`**。它表示「这张图是纯装饰的，读屏器请跳过」——不是忘写，是明确声明。装饰性背景图就用它。

两个体贴属性——`width`/`height`：写上图片原始宽高，浏览器提前留好位置，图片加载完成时页面不跳动（不写的话，图加载出来一瞬间下面的内容突然被推下去，体验很糟）；`loading="lazy"`：滚动到附近才加载，首屏快的秘诀，长页面多图必加。

**figure/figcaption** 给「图 + 图注」这对搭档提供语义绑定，图注和图片永远在一起。

格式选择一句话版：

| 格式 | 一句话 | 何时用 |
| ---- | ---- | ---- |
| jpg | 有损压缩、不支持透明 | 照片 |
| png | 无损、支持透明 | 截图、需要透明的图 |
| webp | 同画质体积更小 | 网页图片首选 |
| svg | 矢量、放大不糊 | 图标、logo、插画 |

### 表格：给真正的二维数据用

表格三件套先行，再谈纪律：

```text
<table>
 ├── thead   表头区（列名那一行）
 │    └── tr → th  表头单元格（自动加粗，读屏器认它当「列名」）
 └── tbody   数据区
      └── tr → td  数据单元格
```

`th` 和 `td` 的区别不是加粗与否，而是语义：th 是「这一列/这一行的名字」，读屏器念数据时会自动带上对应的行头列头——这才是表格对视障用户真正有用的原因。跨行跨列用 `colspan="2"`（横跨 2 列）、`rowspan="2"`（纵跨 2 行）。

**什么时候该用表格**：数据是真正的二维对照（成绩单、参数对比、价格表），行列关系本身有意义。什么时候不该用：

1. **拿表格做页面布局**——上世纪的老手艺，语义全毁，读屏器会把布局念成一张莫名其妙的表；
2. **数据其实是清单**——只是罗列没有行列对照，用 ul/ol 更合适。

## 代码示例

主线任务：**升级上一节的个人介绍页**，加四个新板块：经历时间线、技能清单、作品集表格、作品截图，再补上真实外链。每步保存刷新一次。

### 第 1 步：经历时间线（ol）

把「关于我」section 替换成下面内容——用 ol 给经历编号：

```html
      <section id="about">
        <h2>关于我</h2>
        <p>我是王小明，计算机专业大三学生，正在自学前端。</p>
        <h3>我的经历</h3>
        <ol>
          <li>2024 年：入学，第一次接触编程</li>
          <li>2025 年：加入学校编程社，写了一学年 Python</li>
          <li>2026 年：自学前端，做出第一个个人网站</li>
        </ol>
      </section>
```

浏览器效果：三条经历前面自动带 1. 2. 3. 编号，删一条剩下两条会自动重新编号——这就是「顺序有意义」用 ol 的理由，编号是浏览器算的，不用手写。

为什么这么写：经历按时间递进，打乱顺序语义就错，符合 ol 的定义；section 里可以再放 h3，层级仍然连续（h2 → h3）。

### 第 2 步：技能清单（dl + ul）

「爱好」section 换成技能面板，用 dl 做「技能名 → 熟练度描述」：

```html
      <section id="skills">
        <h2>技能清单</h2>
        <dl>
          <dt>HTML</dt>
          <dd>能独立写出语义化页面（就是你现在看到的）</dd>
          <dt>Python</dt>
          <dd>写过一个学年的脚本和小工具</dd>
        </dl>
        <p>爱好清单：</p>
        <ul>
          <li>羽毛球（每周两次）</li>
          <li>摄影，主要拍校园
            <ul><li>人像</li><li>夜景</li></ul>
          </li>
        </ul>
      </section>
```

浏览器效果：dt 加粗、dd 缩进成对出现；爱好是无序圆点清单，「摄影」下面还缩进挂着两个子弹点——嵌套清单生效了。

为什么这么写：技能是「一条术语配一条描述」，正是 dl 的语义；爱好顺序无所谓，用 ul；子类目嵌在 li 里形成二级清单。

### 第 3 步：作品集表格（table）

新增一个 section 放作品表，thead 表头 + tbody 数据 + 一行跨列合计：

```html
      <section id="works">
        <h2>作品集</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">作品</th><th scope="col">类型</th>
              <th scope="col">完成时间</th><th scope="col">链接</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>个人介绍页</td><td>静态页面</td><td>2026-03</td>
              <td><a href="index.html">查看</a></td>
            </tr>
            <tr>
              <td>成绩查询脚本</td><td>Python 工具</td><td>2026-05</td>
              <td><a href="https://github.com/xiaoming" target="_blank" rel="noopener noreferrer">GitHub</a></td>
            </tr>
            <tr>
              <td colspan="2">合计</td><td colspan="2">2 个作品，全部开源</td>
            </tr>
          </tbody>
        </table>
      </section>
```

浏览器效果：出现一张带表头（加粗）的表格，最后一行「合计」横跨两列——colspan 生效。

为什么这么写：作品名/类型/时间/链接是真正的行列对照，是表格该出场的地方；`th scope="col"` 明确告诉读屏器「这些是列名」；外链按安全规范带上了 `target="_blank" rel="noopener noreferrer"`。

### 第 4 步：作品截图（figure + img）

在表格下面放一张作品截图，配图注：

```html
        <figure>
          <img src="images/portfolio.png" width="640" height="360" loading="lazy"
            alt="个人介绍页截图：顶部是姓名和导航，下方是三个内容区块" />
          <figcaption>个人介绍页效果截图（2026 年 3 月版）</figcaption>
        </figure>
```

浏览器效果：图片按 640×360 的框先占好位置，滚动到附近才开始加载；图下方有一行居中的小字图注。

为什么这么写：alt 描述「内容 + 作用」；宽高防布局跳动；`loading="lazy"` 延迟加载；figure/figcaption 把图和图注绑成一组语义。截图是 png（需要清晰文字），图标类素材则应选 svg——按上一张格式表选。

### 第 5 步：导航更新 + 页脚外链

页头 nav 照第一课的写法把锚点更新为 #about / #skills / #works（正好对应三个新 section 的 id）；footer 加联系方式外链：

```html
    <footer>
      <p>
        找到我：
        <a href="https://github.com/xiaoming" target="_blank" rel="noopener noreferrer">GitHub</a>
        ·
        <a href="mailto:xiaoming@example.com">发邮件</a>
        ·
        <a href="resume.pdf" download>下载简历</a>
      </p>
    </footer>
```

浏览器效果：导航三个锚点全部可跳；页脚 GitHub 在新标签页打开且安全，发邮件唤起邮件客户端，「下载简历」直接下载 PDF 而不是打开。

### 最终结构图

```text
<body>
├── header
│     ├── h1 + p 简介
│     └── nav → #about / #skills / #works
├── main
│     ├── section#about   h2 + p + h3 + ol（时间线）
│     ├── section#skills  h2 + dl（技能对）+ ul（嵌套清单）
│     └── section#works   h2 + table(thead/tbody/colspan)
│                        + figure(img + figcaption)
└── footer
      └── p → GitHub(外链) / mailto / download
```

## 常见坑

1. **坑 1：拿 `<br>` 排版段落**。现象：一段话想换行就狂打 br，段与段没有间距。原因：br 是「回车即内容」的诗歌换行，不是段落分隔。排查：页面里连续出现两个以上 br，基本就是误用——换成 p 包段落，间距交给 CSS。
2. **坑 2：用 `b`/`i` 冒充 `strong`/`em`**。现象：肉眼都是粗体，读屏器却毫无重音反应。原因：b 只有视觉没有语义。对策：想强调一律 strong/em，b/i 只留给书名、术语等排版惯例。
3. **坑 3：alt 缺失或写「图片」**。现象：图挂了显示破图标，视障用户听到的是「image 未加标注」或文件名。原因：alt 被当可选项，或写成类型词。对策：口诀「描述内容与作用」；装饰图明确写 `alt=""` 而不是不写。
4. **坑 4：图片不写宽高，页面加载时跳动**。现象：打开页面的瞬间文字先出来、图片出来后整体被推下去。原因：浏览器不知道图片多大，加载完才腾出空间。对策：写上 width/height（配合 CSS 自适应），长页面再加 `loading="lazy"`。
5. **坑 5：用 `td` 加粗冒充表头**。现象：表格「看起来有表头」，读屏器却把第一行当普通数据念。原因：表头语义靠 `th`，加粗只是默认样式的副作用。排查：`<thead>` 里必须全是 `th`，数据区才用 `td`。

## 小练习

1. 给经历时间线加 `start="3"` 属性刷新看编号从 3 开始，再加 `reversed` 看倒序——理解 ol 的编号由属性控制，不由手写。
2. 给你的专业课写一张 `terms.html` 术语表：dl 放 5 组 dt/dd，再用 ul 列出「参考资料」，链接里至少一个绝对路径、一个相对路径。
3. 给作品集表格加一行用 `colspan` 跨 4 列的备注行，故意把 `th` 写成 `td` 再改回来，感受语义和默认样式的区别。
4. **综合任务**：新建 `portfolio.html` 作品集专页——h1 标题 + 三张 figure 图片（alt 各自认真写、带宽高和 lazy）+ 一张 4 列对比表格（含一行 colspan 合计）+ 页脚外链到 GitHub（target=_blank + rel），提交 W3C Validator 清零全部报错。
