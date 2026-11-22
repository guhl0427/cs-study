---
id: l-html-forms-media
slug: forms-media
title: 表单与多媒体：让用户能输入、能播放
difficulty: 1
estMinutes: 80
tags: [HTML, 表单, 多媒体]
summary: 拆解表单的 name=value 打包机制与原生校验，过一遍 input 全家桶、label 关联和 audio/video/iframe，从零写出一张能校验、能提交的报名表单。
updated: 2026-11-22
resources:
  - id: r-form-mdn
    title: MDN · Web 表单入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Forms
    type: doc
    difficulty: 1
    note: 表单属性极多，这份指南当字典查。
  - id: r-media-mdn
    title: MDN · HTML 视频与音频内容
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Multimedia_and_embedding/Video_and_audio_content
    type: doc
    difficulty: 1
    note: audio/video 全部属性的权威参考。
  - id: r-iframe-mdn
    title: MDN · 其他嵌入技术（iframe）
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Multimedia_and_embedding/Other_embedding_technologies
    type: doc
    difficulty: 2
    note: iframe 的安全细节（sandbox 等）在这里。
---

> 一句话定义：`<form>` 是网页里唯一让用户「提交数据」的入口——登录、搜索、下单的底层都是它；多媒体标签则让页面长出耳朵和眼睛。

## 概念讲解

### 表单的本质：一次 name=value 的打包快递

表单提交时发生了什么？浏览器把每个控件的 **name 和 value 配成一对**，打包成 `字段名=值&字段名=值` 的格式发给服务器。把表单想成**寄快递**：

```text
┌─────────────── <form> 快递箱 ───────────────┐
│                                              │
│   <input name="nickname">   面单上写「收件人」   │
│        用户填的值 → value：小王                │
│                                              │
│   <input name="phone">      面单上写「电话」     │
│        用户填的值 → value：138xxxxxxxx        │
│                                              │
└──────────────────────────────────────────────┘
        action = 收货地址   method = 运输方式
        提交 → 「nickname=小王&phone=138xxxxxxxx」
```

两个属性决定包裹去向：`action` 是数据发往的地址（接口或页面），`method` 是发送方式。

| | GET | POST |
| ---- | ---- | ---- |
| 数据放在哪 | 附在 URL 后面（?a=1&b=2） | 藏在请求体里 |
| 适合 | 搜索、筛选等无副作用的查询 | 登录、注册等会改数据的提交 |
| 敏感数据 | 会留在地址栏和历史记录里 | 相对不显眼（安全仍靠 HTTPS） |

**验证打包机制最直观的方法**：打开 DevTools（F12）→ **Network** 面板 → 提交一次表单 → 点中那条请求 → 看 **Payload/Form Data**——你写的每个 name 和用户填的每个 value 一目了然。反过来推理：**没写 name 的控件不参与打包，等于不存在**。这是表单第一铁律。

### input 全家桶：一个标签，十种性格

`<input>` 是自闭合标签，全靠 `type` 属性决定性格。常用地形图：

| type | 语义 | 关键属性 | 何时用 |
| ---- | ---- | ---- | ---- |
| text | 单行文本（默认） | maxlength、placeholder | 姓名、昵称 |
| password | 遮蔽显示 | minlength | 密码（不等于加密，安全靠 HTTPS） |
| email | 邮箱 | required | 自动校验格式 + 手机弹出邮箱键盘 |
| number | 数字 | min、max、step | 年龄、数量 |
| date | 日期 | min、max | 生日、预约日（浏览器给日期选择器） |
| checkbox | 复选框 | checked | 多选，「我同意条款」 |
| radio | 单选框 | 同 name 分组 | 单选，选班次、性别 |
| file | 上传文件 | accept、multiple | 头像、附件 |
| hidden | 用户看不见 | value | 随表单捎带的暗号（CSRF 令牌、来源标记） |

两个容易搞混的点：`placeholder` 是灰色提示文字，**不是 label**——用户开始输入后它就消失，读屏器也未必读它；占位提示可以用 placeholder，字段名必须用 label。radio 的单选靠 **相同 name**：name 相同的 radio 是一组，选一个取消另一个；name 不同就各选各的，「单选」直接失效。

### label：一行代码的双重收益

`<label for="id">` 通过 for 指向控件的 id，收益立刻兑现两条：

1. **点击体验**：点文字就能聚焦/勾选控件——checkbox 只有指甲盖大，label 把整行文字都变成点击区；
2. **无障碍**：读屏器聚焦控件时朗读 label 文字，没有 label 的输入框在听的用户耳朵里是「编辑框，空白」。

label 也可以直接包裹控件（不写 for），但 for/id 配对最清晰，推荐养成这个写法。

### select / textarea / datalist：三种进阶输入

- `select`：下拉选择，选项是 `option`，占屏幕小、选项多时用；默认选中用 option 的 `selected`。
- `textarea`：多行文本，`rows` 控制初始行数，用户可以拖角拉伸——自我介绍、留言用它。
- `datalist`：**带建议的自由输入**——input 照常手打，同时给一份候选清单。介于 select（只能选）和 text（全靠手打）之间，比如输入城市时给出候选。

### button 三兄弟：默认 submit 的坑

| type | 行为 | 何时用 |
| ---- | ---- | ---- |
| submit | 提交表单 | 表单的提交按钮 |
| reset | 清空表单 | 慎用（误点一下全白填，用户想砸键盘） |
| button | 什么都不做，等 JS 指挥 | 预览、验证码刷新等一切非提交动作 |

**大坑：`<button>` 在表单里默认 type 就是 submit**。表单中间放个「预览」按钮忘了写 type，一点整个表单就提交了。规矩：非提交按钮一律显式写 `type="button"`，提交按钮也建议写明 `type="submit"`，谁都不靠默认值。

### 原生校验：不写 JS 也能拦住错误

HTML5 的校验属性让浏览器在**提交瞬间**自动拦截不合法数据并弹出提示气泡：

- `required`：必填，空着不让交；
- `minlength` / `maxlength`：文本长度上下限；
- `min` / `max` / `step`：数字与日期的范围；
- `pattern`：正则表达式（如 `pattern="[0-9]{11}"` 限定 11 位数字）；
- `type` 本身就是兜底：email/number/date 各自带格式校验。

这是免费的第一道防线：JS 加载失败、用户关了脚本，校验照样工作。规范姿势是**先原生、后增强**——原生属性打底，JS 只负责更花哨的实时提示（CSS 还能用 `:user-invalid` 伪类给非法状态上红框）。想先关掉原生校验自己接管时，给 form 加 `novalidate`。

### 多媒体：audio / video / iframe

`<video>` 和 `<audio>` 用 `src` 指文件、`controls` 一键获得播放器（播放条、音量、进度）。`<video>` 建议配 `poster` 封面图——加载完成前显示的海报，避免黑屏等待。标签体里的文字是兜底：浏览器不支持时显示给用户看。

`autoplay` 有浏览器限制：**静音策略**——不带 `muted` 的自动播放基本被 Chrome/Safari 拦截（防页面一打开就吵人）。想自动播放就 `autoplay muted` 成对出现。

`<iframe>` 是「页中页」，把另一个网页镶进来。B 站/YouTube 的视频下方点「分享」→「嵌入代码」，复制的就是一段现成的 iframe。纪律两条：只嵌可信来源（iframe 里的页面有能力跑自己的 JS）；注意平台给的 `allow`、`sandbox` 属性是安全围栏，别随手删。

## 代码示例

主线任务：**从零写出一张「前端训练营报名表单」**。新建 `signup.html`，沿用第一课的骨架，每步保存刷新。

### 第 1 步：表单容器 + 姓名

```html
  <body>
    <main>
      <h1>前端训练营报名</h1>
      <form action="/signup" method="post">
        <p>
          <label for="nick">姓名</label>
          <input id="nick" name="nickname" type="text" placeholder="例如：王小明" />
        </p>
      </form>
    </main>
  </body>
```

浏览器效果：一行「姓名」文字 + 一个输入框，点击文字光标就跳进输入框（label 关联生效）。

为什么这么写：action 指向接口、method 用 post（注册要改数据，不用 GET）；label 的 for 对上 input 的 id；placeholder 只做格式示范，不做字段名。

### 第 2 步：邮箱、手机与密码

```html
        <p>
          <label for="mail">邮箱</label>
          <input id="mail" name="email" type="email" required />
        </p>
        <p>
          <label for="phone">手机号</label>
          <input id="phone" name="phone" type="tel" pattern="1[0-9]{10}" />
        </p>
        <p>
          <label for="pwd">设置密码</label>
          <input id="pwd" name="password" type="password" required minlength="8" />
        </p>
```

浏览器效果：邮箱框输入 `abc` 提交会被拦下并提示「请包括 @」；手机框只收 11 位数字；密码框内容显示成圆点。

为什么这么写：type=email 白得格式校验和手机专用键盘；type=tel 本身不校验，配 pattern 限定「1 开头的 11 位数字」；密码 minlength=8 在提交时兜底。

### 第 3 步：班次单选（radio）

```html
        <fieldset>
          <legend>选择班次</legend>
          <p>
            <input id="cls-a" name="class" type="radio" value="A" checked />
            <label for="cls-a">A 班（工作日晚间）</label>
          </p>
          <p>
            <input id="cls-b" name="class" type="radio" value="B" />
            <label for="cls-b">B 班（周末全天）</label>
          </p>
        </fieldset>
```

浏览器效果：两个圆点单选框，选 A 再点 B，A 自动弹起——单选生效。

为什么这么写：两个 radio **name 必须相同**（都叫 class）才能互斥；各自的 value 是提交时真正发送的值（`class=A`）；fieldset/legend 给整组选项一个「框 + 组名」，读屏器会先念组名再念选项；默认班次用 checked 预选。

### 第 4 步：兴趣复选（checkbox）

```html
        <fieldset>
          <legend>感兴趣的方向（可多选）</legend>
          <p>
            <input id="int-1" name="interest" type="checkbox" value="web" />
            <label for="int-1">网页开发</label>
            <input id="int-2" name="interest" type="checkbox" value="mobile" />
            <label for="int-2">移动端</label>
            <input id="int-3" name="interest" type="checkbox" value="ai" />
            <label for="int-3">AI 应用</label>
          </p>
        </fieldset>
```

浏览器效果：三个方框可任意勾选，互不影响——和 radio 的本质区别。

为什么这么写：checkbox 各自独立，同 name 提交后形成多值；每个选项都配 label，点击文字即可勾选。

### 第 5 步：城市下拉、自我介绍与快捷建议

```html
        <p>
          <label for="city">所在城市</label>
          <select id="city" name="city">
            <option value="">-- 请选择 --</option>
            <option value="beijing">北京</option>
            <option value="shanghai">上海</option>
            <option value="online">线上班（不限城市）</option>
          </select>
        </p>
        <p>
          <label for="bio">自我介绍</label>
          <textarea id="bio" name="bio" rows="4" placeholder="写两句你为什么想学前端"></textarea>
        </p>
        <p>
          <label for="ref">推荐人（可选）</label>
          <input id="ref" name="referrer" type="text" list="ref-list" />
          <datalist id="ref-list">
            <option value="学姐张同学"></option>
            <option value="课程公众号"></option>
            <option value="自己找来的"></option>
          </datalist>
        </p>
```

浏览器效果：城市是点开才出选项的下拉框；自我介绍是四行高的可拉伸文本域；推荐人输入框聚焦时下方浮出三条候选，可以采纳也可以自己打——datalist 的「自由输入 + 建议」。

为什么这么写：select 的首项 value 为空，配合下面 required 形成强制选择；textarea 用 rows 给足初始空间；datalist 挂在普通 text 上，input 的 list 指向 datalist 的 id。

### 第 6 步：提交按钮 + 提交瞬间

```html
        <p>
          <button type="submit">提交报名</button>
          <button type="reset">清空重填</button>
        </p>
      </form>
```

浏览器效果：两个按钮。点击「提交报名」——必填没填时浏览器原地弹出气泡（「请填写此字段」），根本不发请求；全部合法时表单提交。

现在用 DevTools 验证打包机制：F12 → Network 面板 → 勾选「保留日志」→ 再提交一次 → 点中 `/signup` 那条请求 → Payload 标签，你会看到：

```text
nickname: 王小明
email: xiaoming@example.com
phone: 13800001234
class: A
interest: web, ai
city: beijing
bio: 我想做出自己的网站
referrer: 课程公众号
```

每个 name 对应一个 value——没有 name 的控件（本例没有）根本不会出现。这张「快递面单」就是后端将要收到的全部数据。

### 最终结构图

```text
<form action="/signup" method="post">
├── label + input#nick        type=text
├── label + input#mail        type=email  required
├── label + input#phone       type=tel    pattern
├── label + input#pwd         type=password minlength=8
├── fieldset > legend「班次」+ radio×2（name=class，checked 默认）
├── fieldset > legend「方向」+ checkbox×3（name=interest）
├── label + select#city（option×4，首项空值）
├── label + textarea#bio      rows=4
├── label + input#ref + datalist 候选
└── button[type=submit] + button[type=reset]
```

## 常见坑

1. **坑 1：控件忘写 name**。现象：表单提交了，后端/Network 面板里却找不到那个字段的数据。原因：打包只收「name=value」对，没 name 的控件不参与打包。排查：提交一次看 Network → Payload，缺哪个字段就去给哪个控件补 name。
2. **坑 2：表单中间的按钮忘写 type**。现象：一个「预览」按钮，一点整张表单就提交了。原因：button 在表单内默认 type=submit。对策：非提交按钮显式写 `type="button"`，提交按钮也写明 `type="submit"`，不靠默认值。
3. **坑 3：placeholder 当 label 用**。现象：输入框里只放灰色提示，外面没有字段名；用户一开始输入就不知道这框是干嘛的，读屏器也可能不读。对策：字段名一律 label + for/id，placeholder 只做格式示范。
4. **坑 4：radio 的 name 不一致**。现象：本该单选的「班次」能同时选中两个。原因：单选靠相同 name 分组，name 不同就是两组互不相干的单选框。排查：同一组 radio 逐个检查 name 是否完全一致（拼写和大小写都要）。
5. **坑 5：autoplay 没生效**。现象：video 加了 autoplay 却静止在画面上。原因：浏览器的静音策略拦截了带声音的自动播放。对策：`autoplay muted` 成对出现，或干脆放弃自动播放，把 controls 留给用户。

## 小练习

1. 给第一课的个人介绍页加「留言」表单：昵称（text，必填）+ 留言（textarea，必填）+ 提交按钮，全部用 label 关联，提交后在 Network 面板核对字段。
2. 把示例里手机号的 pattern 改成允许「1 开头的 11 位数字或带 - 分隔」，故意输错几个值，观察气泡提示的措辞随 type/required/pattern 怎么变化。
3. 在 select 上加 `multiple` 属性、在第一个 radio 上试改 name，分别观察「可多选下拉」和「单选失效」的现象，再改回来。
4. **综合任务**：写一张完整的「活动报名页」`register.html`——至少含 text/email/radio/checkbox/select/textarea 各一、所有控件有 label、关键字段带 required/minlength/pattern、两个按钮类型正确，提交到 Network 面板截一张完整 Payload 的图作为验收。
