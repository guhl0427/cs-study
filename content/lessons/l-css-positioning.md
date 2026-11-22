---
id: l-css-positioning
slug: css-positioning
title: 文档流与定位：元素到底站在哪
difficulty: 2
estMinutes: 75
tags: [CSS, 布局]
summary: 块级堆叠、行内并排是默认规则；position 五模式决定谁「脱离队伍」，z-index 决定谁压住谁——读懂文档流，角标、吸顶、悬浮就都通了。
updated: 2026-11-22
resources:
  - id: r-mdn-position
    title: MDN · position 属性
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/position
    type: doc
    difficulty: 2
    note: 五种定位模式的权威定义，配了可交互演示。
  - id: r-webdev-position
    title: web.dev · Learn CSS：Position
    url: https://web.dev/learn/css/position
    type: doc
    difficulty: 2
    note: 官方课程对 z-index 与层叠上下文的直觉讲解。
  - id: r-mdn-overflow
    title: MDN · 块级格式化上下文（BFC）
    url: https://developer.mozilla.org/zh-CN/docs/Web/Guide/CSS/Block_formatting_context
    type: doc
    difficulty: 3
    note: 想深挖「为什么 absolute/flow-root 能隔断布局问题」时读。
---

> 一句话定义：所有元素默认站在**正常文档流**里排队（块级竖排、行内横排），position 决定谁脱离队伍自定坐标，z-index 决定重叠时谁压住谁。

## 概念讲解

### 正常文档流：默认的排队规则

不写任何定位样式时，浏览器按「正常文档流」给元素排队：

- **块级元素**（div、p、h1、section…）独占一行，从上到下堆叠，宽度默认撑满父容器；
- **行内元素**（span、a、strong…）从左到右并排，排满换行，宽高和上下 margin 无效；
- **行内块**（inline-block）是折中：横向并排，但可以被设置宽高——老式「横向排列菜单」曾全靠它，如今大多让位给 Flex。

理解文档流的意义在于：**布局异常的第一步永远是问「它为什么不在它应该在的位置」**——大概率是某个属性（float、absolute、负 margin）让它脱离或扭曲了文档流。position 就是最大的「脱队机制」。

### position 五模式逐一讲透

```
static      → 默认值。老老实实排队，top/left 等坐标属性无效
relative    → 占着坑，但可以相对原位偏移（原坑不腾出）
absolute    → 彻底脱队，相对「最近的定位祖先」自定坐标
fixed       → 脱队，相对浏览器视口定位，滚动也不动
sticky      → 平时在队伍里，滚到阈值后「粘」在视口上
```

**relative（相对定位）**：元素仍在文档流里**占着自己的坑**，只是视觉上用 `top/left/right/bottom` 相对原位偏移——搬走了，坑还留着，邻居不会过来填。两个用途：一是微调（图标右移 2px）；二是**给 absolute 子元素当定位参照物**（下面马上讲，这是它更重要的身份）。

**absolute（绝对定位）**：元素从文档流里**彻底移除**，仿佛被拎到了新图层。关键问题是「相对谁定位」：它向上逐层寻找**最近一个 position 不是 static 的祖先**，以那个祖先为坐标系；一个都没有时，退而求其次相对整个页面。所以 absolute 几乎总是成对出现：

```css
.parent { position: relative; }  /* 父元素：我当坐标原点 */
.child  { position: absolute;    /* 子元素：脱队但以父元素为锚 */
          top: 0; right: 0; }    /* 贴到父元素右上角 */
```

忘了给父元素设 relative，absolute 子元素就会「飞」到页面的某个角落——这是定位课第一大事故。absolute 元素不再占据原来的坑，后续元素会顶上来填空。

**fixed（固定定位）**：相对**浏览器视口**定位，页面怎么滚它都不动。导航栏「始终悬在顶部」、右下角「回到顶部」按钮、模态弹窗遮罩，都是 fixed 的舞台。

**sticky（粘性定位）**：融合两者的「 conditional 脱队」——平时在文档流里正常占位，滚动超过你设的阈值后就粘在视口对应边缘，像便利贴：

```css
.nav {
  position: sticky;
  top: 0;          /* 阈值：距视口顶部 0px 时开始粘住 */
}
```

吸顶导航的原理就这四行。注意 sticky 元素**始终占坑**（没脱队），且只在它的父容器范围内粘——滚出父容器它就跟着走了。

### z-index：重叠时谁压住谁

元素重叠时，浏览器默认按「后写的盖先写的」；`z-index` 给定位元素（非 static）设置图层号，数字大的在上。但新手都撞过这堵墙：**z-index 设了 9999 还是被盖住**。直觉版解释：某些属性（如给父元素加 transform、opacity 小于 1）会创建一个新的「层叠上下文」——相当于父元素自己开了一个密封盒子，盒内元素的 z-index 只在盒内比大小，**整个盒子的层级由外层决定**。所以内部 9999 打不过外面盒子旁边的一个 z-index: 2。排查口诀：被盖住时，F12 沿祖先链找「谁开了密封盒」（有 transform/opacity/filter/position+z-index 的祖先），要么提高那个盒子的层级，要么去掉多余的密封属性。

### 负 margin 与 transform：两种「移动」的本质区别

```css
/* 负 margin：真的改变了盒子占位，邻居会跟着移动 */
.box { margin-left: -20px; }

/* transform 位移：盒子占位不变，只是视觉上「画」到了别处 */
.box { transform: translateX(-20px); }
```

区别有三：margin 是布局属性，挤占空间、参与文档流计算；transform 是渲染属性，不占位、不影响邻居，且**性能更好**（浏览器可 GPU 加速），所以动画永远优先用 transform 而不是 margin/left。第三点最隐蔽：transform 会让元素创建层叠上下文（就是上面说的「密封盒」），还会让内部的 fixed 子元素失效——「加了 transform 后 fixed 弹窗错位」是真实高频 bug。

### 三隐士对照：display:none vs visibility:hidden vs opacity:0

| 属性组合 | 占不占坑 | 能不能过渡 | 能不能交互（点击） | 典型场景 |
| ---- | ---- | ---- | ---- | ---- |
| display: none | 不占 | 不行（无中间态） | 不能 | 彻底移除：菜单、弹窗 |
| visibility: hidden | 占 | 可以 | 不能 | 保留布局的隐藏 |
| opacity: 0 | 占 | 可以 | **能**（还能点到！） | 淡入淡出动画的起点 |

三者都「看不见」，行为却完全不同：display 是「查无此人」，visibility 是「隐身但占位」，opacity 是「透明但可交互」——第三种常成为事故源：把按钮 opacity 设为 0 想隐藏它，用户却仍能点到。隐藏 + 过渡动画的标准组合是 `opacity + visibility`（都能参与 transition），或用 display 配合关键帧动画。

## 代码示例

主线任务：一个「带角标徽章的卡片」+「吸顶导航栏」。这两件事是 relative/absolute/sticky 的招牌用法，跟着推导一遍就掌握了定位的 80%。

**第 0 步：原始 HTML（保存为 position.html）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>定位实战</title>
  <style>
    /* 样式逐步加进来 */
  </style>
</head>
<body>
  <nav class="nav">
    <b>定位实战</b>
    <span class="nav-tip">下滚观察吸顶</span>
  </nav>
  <main class="wrap">
    <div class="card">
      <h3>消息中心</h3>
      <p>未读消息的角标该贴在图标右上角。</p>
      <span class="icon">收件箱</span>
    </div>
    <p class="filler">继续向下滚动，观察导航栏吸顶……</p>
    <p class="filler">（这段只是占位）</p>
    <p class="filler">（这段也是占位）</p>
  </main>
</body>
</html>
```

**第 1 步：基础样式 + 吸顶导航（sticky）**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

.nav {
  position: sticky;   /* 平时占位，滚动到阈值后粘住 */
  top: 0;             /* 距视口顶部 0px 时触发 */
  z-index: 10;        /* 盖住下方滚动内容 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #1f2328;
  color: #fff;
}

.filler { padding: 60px 24px; color: #9ea7b3; }
```

刷新后页面变高，向下滚动：导航栏钉在视口顶部不动——`sticky + top: 0` 就是吸顶的全部原理，比 fixed 优雅在**初始位置由文档流决定**，不用自己算偏移。

**第 2 步：卡片容器（relative 登场）**

```css
.wrap { max-width: 640px; margin: 24px auto; }

.card {
  position: relative;   /* 关键：声明自己是定位参照物 */
  width: 320px;
  padding: 16px;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

此时 `position: relative` 没带来任何视觉变化——它在这一步的作用**纯粹是当锚**：给下面第 3 步的角标提供坐标原点。这是 relative 最常见也最容易被忽略的身份。

**第 3 步：角标徽章（absolute 定位到右上角）**

```css
.icon {
  display: inline-block;
  padding: 8px 12px;
  background: #f2f4f7;
  border-radius: 6px;
  position: relative;   /* 图标自己也是角标的锚 */
}

.icon::after {           /* 用伪元素画角标，不污染 HTML */
  content: "3";
  position: absolute;
  top: -8px;             /* 相对 .icon：上移出界 */
  right: -8px;           /* 相对 .icon：右移出界 */
  min-width: 20px;
  padding: 2px 6px;
  background: #d93025;
  color: #fff;
  font-size: 12px;
  text-align: center;
  border-radius: 999px;
}
```

刷新后：红色「3」字圆点贴在「收件箱」的右上角，一半悬在边界外。坐标系复盘：`.icon` 是 relative（锚），`::after` 是 absolute（脱队的角标），`top/right` 的负值表示向边界外偏移——**角标 = 相对定位锚 + 绝对定位徽章 + 负坐标**，所有消息 App 的未读数都是这个配方。

**第 4 步：卡片的浮动操作按钮（fixed 的领地）**

```css
.fab {
  position: fixed;     /* 相对视口，滚动不动 */
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #1b62a6;
  color: #fff;
  font-size: 24px;
  line-height: 52px;   /* 单行文字垂直居中 */
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

```html
<!-- body 末尾加一个悬浮按钮 -->
<a class="fab" href="#top">+</a>
```

刷新后：右下角出现蓝色圆形按钮，无论怎么滚动它都钉在原地——fixed 相对视口定位，与任何父元素无关。

**第 5 步：层叠顺序验证（z-index 实验场）**

```css
.fab { z-index: 5; }   /* 按钮在导航之下、内容之上 */
/* 把 z-index 改成 20 再试：按钮盖过了吸顶导航 */
```

实验：滚动页面让卡片滑过按钮位置，观察谁在上层；再把 `.fab` 的 z-index 从 5 改成 20——按钮开始盖住吸顶导航。同时做个反例：给 `.wrap` 加 `transform: translateY(10px)`，再把 `.fab` 改回 absolute 试试放进卡片里——你会发现它的 fixed/层级行为变了，因为 transform 给祖先开了「密封盒」。这两组小实验做完，层叠上下文就是你的直觉而不是玄学。

## 常见坑

1. **坑 1：absolute 子元素飞到页面角落**。原因：忘了给父元素 `position: relative`，子元素找不到定位祖先，退回相对整个页面。排查：F12 选中该元素，看 Computed 面板里它的 containing block 是谁；规范做法是「relative 父 + absolute 子」成对写。
2. **坑 2：sticky 不吸顶**。三个常见病因：父容器设了 `overflow: hidden/auto/scroll`（粘性失效的经典原因）；没写 `top`（必须有阈值）；父容器太矮，滚出父容器就不粘了。排查顺序：先查 overflow，再查 top，最后看父容器高度。
3. **坑 3：z-index 设了 9999 还被盖住**。直觉原因：某个祖先（transform/opacity/filter/position+z-index）创建了层叠上下文，当前元素的层级被封在盒子内比较。修复：提高那个祖先盒子的 z-index，或移除多余的 transform/opacity。
4. **坑 4：opacity: 0 的元素还能点到**。透明不等于不可交互，点击事件照常触发。需要「看不见且点不到」时用 `display: none` 或 `visibility: hidden`，或补 `pointer-events: none`。
5. **坑 5：父元素加了 transform，内部 fixed 元素错位**。transform 会让 fixed 子元素的参照物从视口变成这个祖先。修复：把 fixed 元素移出带 transform 的容器，或用 position: sticky/absolute 方案替代。

## 小练习

1. **relative vs absolute 辨析**：给一个 h3 分别加 `position: relative; top: 10px` 和 `position: absolute; top: 10px`，观察后续元素位置有什么不同，用一句话解释原因。
2. **角标变体**：把示例角标改成左下角、数字换成「99+」，并用 `max-width` + `overflow: hidden` 处理超长文本。
3. **找错误**：同事的吸顶导航「时灵时不灵」，代码是 `.nav { position: sticky; }` 外层 `.layout { overflow-x: auto; }`——指出病因并给出两种修复方案。
4. **综合定位任务**：做一个「悬浮帮助中心」：吸顶导航（sticky，z-index 10）+ 页面中央一张卡片，卡片右上角 absolute 角标「1」，卡片内部图片上叠一个 hover 才出现的 absolute 半透明遮罩（opacity 过渡），右下角 fixed 悬浮按钮。要求每个定位元素都能说出「相对谁定位」。
