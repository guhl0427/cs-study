---
id: l-html-a11y-seo
slug: a11y-seo
title: 可访问性与 SEO：写给人也写给机器的 HTML
difficulty: 2
estMinutes: 65
tags: [HTML, 可访问性, SEO]
summary: 认识页面的三类「机器读者」——读屏器、键盘用户、爬虫，学会 alt 文案、landmark、键盘可操作性与 ARIA 两个高频用法，并亲手重构一个语义塌方的坏页面。
updated: 2026-11-22
resources:
  - id: r-a11y-mdn
    title: MDN · 无障碍（Accessibility）
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Accessibility
    type: doc
    difficulty: 2
    note: 无障碍的系统课程，本节内容的完整版。
  - id: r-a11y-wai
    title: W3C WAI · 无障碍介绍
    url: https://www.w3.org/WAI/fundamentals/accessibility-intro/
    type: doc
    difficulty: 2
    note: 无障碍国际标准 WCAG 的官方入门。
  - id: r-seo-google
    title: Google 搜索中心 · SEO 入门指南
    url: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
    type: doc
    difficulty: 2
    note: 官方 SEO 指南，title 与 description 的写法以它为准。
---

> 一句话定义：你的 HTML 有三类不「看」屏幕的读者——读屏器、只用键盘的用户、搜索引擎爬虫；语义化 HTML 是同时伺候好三者的唯一捷径。

## 概念讲解

### 三类读者：他们都在「读」你的标签

前面几课反复说「语义化很重要」，本节把账算清楚。你的页面有三种读者根本不看渲染出来的像素，全靠解析 HTML 源码理解页面：

```text
   你看到的                      他们读到的
┌──────────────┐            ┌──────────────────┐
│ 精美的页面     │   解析      │ "标题，一级：王小明" │
│ 颜色/字体/图  │ ────────→  │ "链接：关于我"      │
│ 视觉布局     │             │ "图像，无描述" ⚠    │
└──────────────┘            └──────────────────┘
```

1. **读屏器与视障用户**。中国有超过 1700 万视障人群，读屏器（如 Windows 的 NVDA、iOS 的 VoiceOver）把 DOM 念成语音。它能读什么、跳到哪，完全取决于你的标签：有语义地标就能一键跳导航，图片没 alt 就只能念文件名。
2. **键盘用户**。运动障碍用户用不了鼠标；也有大量健全的高级用户习惯 Tab 键导航。键盘能不能走通你的页面，取决于「可交互的东西」是不是原生可聚焦的元素。
3. **搜索引擎爬虫**。爬虫大体上读的是 HTML 文本与结构（不执行你的 CSS）。它给 h1 权重、靠语义标签分区、靠 alt 理解图片——语义塌方的页面在搜索里就是隐形的。

再补一类容易被忽略的：**情境性障碍**——强光下看不清低对比度文字、手抱婴儿只能单手操作、手臂骨折打石膏、嘈杂环境听不了音频。可访问性不是慈善，是让任何人在任何状态下都能用；今天多写的一个 alt，就是某个用户明天能完成的下单。

### alt 文案：给图片写「台词」

上上节说过 alt 必填，本节讲怎么写好。先分清三种图：

| 图的类型 | alt 写什么 | 例子 |
| ---- | ---- | ---- |
| 信息图 | 描述内容与作用 | `alt="2026 年学习时长柱状图，Web 一门占比最高"` |
| 功能图（链接/按钮里的图） | 描述去向与动作 | 放大镜图标按钮：`alt="搜索"` |
| 装饰图 | 空字符串 `alt=""` | 分隔花纹、装饰背景 |

不合格写法对照：不写 alt（读屏器念出整个文件名）；`alt="图片"`（等于没说）；`alt="photo.jpg"`（念文件名给用户听）。空 alt 的装饰图是「明确声明：跳过我」——注意空 alt 和不写 alt 是两回事。

### landmark 与跳转链接：给页面装「路牌」

第一课学的 header/nav/main/aside/footer 在无障碍领域有个专门的名字：**landmark（地标）**。读屏器给它配了快捷键——用户可以一键跳到导航、跳到主内容、跳到搜索区。这就是语义化布局的「隐形福利」：你只是把 div 换成了 main，视障用户就获得了「直达正文」的能力。

再进一步：导航很长时，键盘用户每翻一页都要 Tab 过十几个导航链接才能到正文。解法是**跳转链接（skip link）**——页面第一个元素是「跳到主内容」链接，视觉上藏在屏幕外，Tab 第一键把它唤出来，回车直达 main。写法极简单：

```html
<a class="skip-link" href="#main">跳到主内容</a>
```

### 键盘可操作：a 与 button 的语义分工

键盘用户的世界只有 Tab（跳到下一个可聚焦元素）、Enter、空格。两个原生的可交互元素分工明确：

- **`<a href>`：去别处**。跳到另一个页面/锚点，Tab 可聚焦，Enter 触发。
- **`<button>`：在原地做动作**。提交、弹窗、展开折叠，Tab 可聚焦，Enter 和空格都能触发。

**div 加 onclick 是三宗罪**：Tab 键聚焦不到它；Enter/空格不触发它的点击事件；读屏器不报它是「按钮」（它只是「文本」）。修复要么换成真 button，要么补上 tabindex、键盘事件和 role——三件套补齐才勉强追平原生元素，何苦呢。

**tabindex 的克制原则**：

| 值 | 含义 | 该不该用 |
| ---- | ---- | ---- |
| 不写 | 按自然顺序 Tab | 默认，最好 |
| `0` | 把元素加入 Tab 序 | 少用（自定义组件才需要） |
| `-1` | 只允许 JS 聚焦，不进 Tab 序 | 特定场景 |
| 正数 | 强行指定 Tab 顺序 | **反模式**——打乱自然顺序，页面一改全乱 |

### ARIA：只做 HTML 表达不了的事

ARIA 是给 HTML 补充语义的属性集。**第一规则：能用原生元素就不用 ARIA**——原生 button 自带键盘支持和角色，ARIA 手搓出来的一样东西只会更费劲、更容易错。

日常高频就两个例子：

1. **`aria-label`：给没有文字的控件起名**。右上角的「X」关闭按钮、搜索框旁的放大镜图标按钮——读屏器念不出「X」是什么，补 `aria-label="关闭弹窗"`。
2. **`aria-expanded`：告诉读屏器折叠面板的当前状态**。点击「展开详情」按钮时把它设为 true/false，读屏用户就知道内容是开是关：

```html
<button aria-expanded="false" aria-controls="detail">展开详情</button>
<div id="detail" hidden>隐藏的详细内容</div>
```

反例要记住：给**已经有可见文字**的按钮再加 aria-label，读屏器会优先念 aria-label，反而把可见文字盖掉了——别画蛇添足。

### SEO 初步：让爬虫一眼看懂你

搜索引擎把你的页面收录进索引，靠三样初步材料：

- **`<title>`**：搜索结果里那行蓝色链接的文字。写法纪律：每页唯一、关键词前置、控制在 50-60 个字符。全站都叫「首页」等于放弃搜索流量。
- **`<meta name="description">`**：搜索结果标题下面的灰色摘要，一句话（约 120 字符内）说清本页价值，写得像广告语而非关键词堆砌。
- **语义化结构即 SEO**：爬虫按 h1-h6 建立页面大纲，标题里的关键词权重更高；语义标签帮它识别「哪块是导航、哪块是正文」。**给读屏器做的一切，爬虫全收**——这是本节标题「写给人也写给机器」的含义。

robots.txt（放在站点根目录，告诉爬虫「哪些路径别抓」）与 sitemap.xml（告诉爬虫「我有哪些页面」）属于建站层面的常识，知道名字和用途即可。

最后给一张速查表，本节所有要点的浓缩：

| 坏写法 | 好写法 | 为什么 |
| ---- | ---- | ---- |
| `div` + onclick | `<button>` | 键盘可达、读屏器报角色 |
| 图不写 alt | 认真写 alt / 空 alt | 读屏器与爬虫的图片替身 |
| 全 div 布局 | header/nav/main/section | landmark 可跳转 |
| 全站同名 title | 每页独特 title | 搜索结果的第一行 |
| 正数 tabindex | 依赖自然顺序 | Tab 顺序不乱 |

## 代码示例

主线任务：**审查并修复一个「语义塌方」的坏页面**——这是真实世界里接手老项目最常见的场景。新建两个文件对照着做。

### 第 1 步：看一个坏页面（bad.html）

下面这个页面「看起来正常」，问题全埋在语义里：

```html
<!DOCTYPE html>
<html>
  <head>
    <title>未命名</title>
  </head>
  <body>
    <div class="top">XX 手机维修</div>
    <div>
      <div onclick="go('/price')">价格表</div>
      <div onclick="go('/contact')">联系我们</div>
    </div>
    <div class="content">
      <div style="font-size: 28px">服务范围</div>
      <div style="font-size: 14px">我们维修各品牌手机，屏幕、电池、进水均可处理。</div>
      <div style="font-size: 14px">
        门店照片：
        <img src="store.jpg" />
      </div>
      <div style="font-size: 18px">营业时间</div>
      <div style="font-size: 12px">每天 9:00 - 21:00</div>
    </div>
    <div style="text-align: center">© 2026 XX 手机维修</div>
  </body>
</html>
```

### 第 2 步：五分钟审查法（先学会诊断）

拿到任何页面，按这个清单过一遍，三个方法各花 1 分钟：

1. **按 Tab 键走一遍**：焦点能不能到「价格表」「联系我们」这两个 div？——到不了，键盘用户永远进不去。
2. **读 title 和标题链**：标签页叫「未命名」；页面里 h1 到 h6 一个都没有，所谓「标题」全是加了字号的 div——大纲不存在。
3. **在 DevTools Elements 面板搜 `<img`**：这张 store.jpg 没有 alt——读屏器会念出「store.jpg」，用户听到一个文件名。

诊断结论：无 landmark、无标题大纲、交互元素不可聚焦、图片无替身、title 无效。

### 第 3 步：语义化重构（good.html）

逐项修复后的完整代码：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>XX 手机维修 · 价格与门店信息</title>
    <meta name="description" content="XX 手机维修：屏幕、电池、进水维修，附价格表与营业时间。" />
  </head>
  <body>
    <header>
      <h1>XX 手机维修</h1>
      <nav aria-label="站点导航">
        <a href="/price">价格表</a>
        <a href="/contact">联系我们</a>
      </nav>
    </header>

    <main id="main">
      <section>
        <h2>服务范围</h2>
        <p>我们维修各品牌手机，屏幕、电池、进水均可处理。</p>
        <figure>
          <img src="store.jpg" alt="门店实拍：临街玻璃门面，店内两张维修工作台" width="480" height="320" />
          <figcaption>门店环境（2026 年实拍）</figcaption>
        </figure>
      </section>

      <section>
        <h2>营业时间</h2>
        <p>每天 9:00 - 21:00</p>
      </section>
    </main>

    <footer>
      <p>© 2026 XX 手机维修</p>
    </footer>
  </body>
</html>
```

### 第 4 步：逐项对照「为什么」

| 修复点 | 之前 | 之后 | 收益 |
| ---- | ---- | ---- | ---- |
| 页面身份 | title「未命名」 | 独特 title + description | 搜索结果有名字有摘要 |
| 大纲 | div + font-size | h1 → h2 → p | 读屏器/爬虫可按标题导航 |
| 导航 | div onclick | `<a href>` + nav | Tab 可达、Enter 可跳、landmark 可直达 |
| 图片 | 无 alt | 内容型 alt + 宽高 | 读屏器听得懂、加载不跳动 |
| 结构 | 全 div | header/main/section/footer | 读屏器一键跳主内容 |
| 语气 | 「font-size 当标题」 | 标题归标题、字号归 CSS | 结构与外观解耦 |

注意导航链接包了一层 `nav aria-label="站点导航"`：当页面有多个 nav（比如页脚也有一组链接）时，aria-label 区分「这是哪个导航」——这正是 aria-label 的正当用途：**给 HTML 原本区分不了的东西起名**，而不是覆盖已有文字。

### 验证与最终结构图

验证三连：Tab 键从页面顶部走一遍（导航可达、顺序自然）；提交 W3C Validator（结构合法）；打开 DevTools 的无障碍面板（右键元素 → 检查 → Accessibility 标签）看每个元素对外暴露的「角色和名字」。

```text
good.html
├── head：title（独特）+ meta description
└── body
      ├── header
      │     ├── h1  店名（全页唯一）
      │     └── nav[aria-label] → 价格表 / 联系我们
      ├── main#main
      │     ├── section  h2 服务范围 + p + figure(img[alt] + figcaption)
      │     └── section  h2 营业时间 + p
      └── footer  版权
```

## 常见坑

1. **坑 1：aria-label 滥用在已有文字的元素上**。现象：按钮明明写着「提交」，读屏器却念别的。原因：aria-label 的优先级高于元素内文字，会覆盖可见文案。对策：只有控件没有可见文字（图标按钮）时才用 aria-label。
2. **坑 2：正数 tabindex 排 Tab 顺序**。现象：Tab 跳转顺序诡异，插了新元素就全乱。原因：tabindex="1/2/3" 强行指定顺序，压过自然顺序。对策：删掉正数 tabindex，靠 DOM 顺序排 Tab 序。
3. **坑 3：div + onclick 冒充按钮**。现象：鼠标能用，键盘 Tab 走不到、Enter 没反应，读屏器不报「按钮」。对策：换原生 button（或带 href 的 a）；实在要自定义，tabindex/键盘事件/role 三件套一个不能少。
4. **坑 4：装饰图写成信息图**。现象：`alt="红色渐变背景"` 这类描述跟着装饰图到处念。对策：纯装饰图写 `alt=""` 让读屏器跳过；信息图才写内容描述——先分清图的类型再动笔。
5. **坑 5：一个页面多个 h1 或全站同一个 title**。现象：大纲起点混乱，搜索结果里所有页面长一个样。对策：h1 全页唯一且就是页面主题；title 每页独特、关键词前置。

## 小练习

1. 给第一课的个人介绍页加「跳到主内容」的 skip link：用 CSS 把它默认移出屏幕、Tab 第一键时唤出（不会 CSS 也没关系，先写出 HTML 结构）。
2. 找一个你常用的网站，按 Tab 键走 20 步，记录：焦点是否可见、有没有 skip link、图标按钮读屏器会念什么（用 DevTools 的 Accessibility 面板查）。
3. 把第 2 步的诊断五连（Tab、title、搜 img、查 landmark、查标题大纲）用在第一课你自己写的页面上，列出发现的问题清单。
4. **综合任务**：亲手复刻本课的坏页面 bad.html 并完成重构，验收标准三选一不许跳过——Validator 清零、Tab 全程可达、每个 img 的 alt 通过「遮住图片给别人听 alt 能想象画面」测试。
