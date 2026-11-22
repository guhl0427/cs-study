---
id: l-sec-csrf
slug: sec-csrf
title: CSRF：借你的身份发请求
difficulty: 3
estMinutes: 75
tags: [安全, 后端]
summary: 攻击者不偷凭证、只「借用」——浏览器自动带 Cookie 的机制被恶意网页利用；SameSite 三档行为 + CSRF Token 双保险，主线在本地双「站点」完成伪造表单、SameSite 拦截、Token 防线三段验证。
updated: 2026-11-22
resources:
  - id: r-owasp-csrf
    title: OWASP · Cross-Site Request Forgery (CSRF)
    url: https://owasp.org/www-community/attacks/csrf
    type: doc
    difficulty: 3
    note: 攻击原理与防御措施的权威出处。
  - id: r-owasp-csrf-cs
    title: OWASP · CSRF Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
    type: doc
    difficulty: 3
    note: 防御方案清单：Token、SameSite、双提交 Cookie 等逐一对比。
  - id: r-mdn-samesite
    title: MDN · Set-Cookie（SameSite 属性）
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Set-Cookie
    type: doc
    difficulty: 2
    note: SameSite 三档行为与浏览器默认值，CSRF 防御的第一道闸。
---

> 一句话定义：CSRF（跨站请求伪造）= 恶意网站**借用你浏览器里已有的登录 Cookie**，在你不知情时发出「看起来完全合法」的请求——攻击者从头到尾不需要知道你的密码。

## 概念讲解

### 攻击成立的必要条件：浏览器自动带 Cookie

一切要从 Cookie 的设计说起：你登录过 bank.com，浏览器存下它的登录 Cookie，之后**任何**发往 bank.com 的请求都会自动带上它——不管这个请求是你亲手点的，还是恶意网页在背后伪造的。

这条「自动带牌」的机制单独看是贴心设计（省掉每次登录），但组合上另外两个事实就成了漏洞：

1. **请求可伪造**：表单与 img 从任何网页都能发往任何站点（表单提交不受 CORS 预检限制），参数想写什么写什么；
2. **服务器只认牌不看人**：Cookie 合法 → 请求合法，服务器无法区分「用户亲手提交」与「恶意页面代发」。

三者凑齐，CSRF 成立，缺一个都不成立——这也预告了防御思路：**掐断自动带牌（SameSite），或让请求参数不可伪造（Token）**。

### 完整攻击剧本：一步一步看钱怎么被转走

前提：用户已在浏览器登录 bank.com（Cookie 有效期内），然后打开了恶意页面。

```text
① 用户在 bank.com 登录过 → 浏览器存有有效 Cookie（前提）
② 用户被诱导打开 evil.com（中奖页面、福利链接……）
③ evil.com 返回的页面里藏着一个自动提交的表单：
     <form action="https://bank.com/transfer" method="POST">
       <input name="to" value="attacker">
       <input name="amount" value="10000">
     </form>
④ 页面加载即 submit() → 浏览器向 bank.com 发出 POST
⑤ 关键一步：浏览器自动附带 Cookie: sid=合法会话（攻击者全程没碰过它）
⑥ bank.com 验 Cookie：合法 → 执行转账 10000 元到 attacker
⑦ evil.com 读不到响应（同源策略），但它不在乎——破坏已经发生
```

恶意页面本体只有几行：

```html
<h3>恭喜你抽中大奖！</h3>
<form action="https://bank.com/transfer" method="POST" id="f">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.getElementById('f').submit()</script>
```

注意 ⑦：同源策略保证 evil.com **读不到** bank.com 的响应内容——但这不重要，CSRF 要的只是「请求发出、副作用发生」，从来不需要看到回复。

### CSRF vs XSS：一字之差，两种事故

| | XSS | CSRF |
| ---- | ---- | ---- |
| 是否注入代码 | 往页面里**注入**脚本 | **什么都不注入**，只触发请求 |
| 凭证处理 | 读 Cookie 偷走（未设 HttpOnly 时） | 借用 Cookie，全程没见过内容 |
| 谁在执行 | 受害者浏览器执行注入的 JS | 浏览器只是「正常地」发了个请求 |
| 防御核心 | 转义 / 白名单过滤 | SameSite + CSRF Token |
| 交集 | XSS 得手后可在站内顺手发请求，**等效完成 CSRF** | — |

分界一句话：**XSS 偷身份，CSRF 借身份**。防御思路也因此不同——XSS 管住「数据别变代码」，CSRF 管住「请求别被代发」。

### 防线一：SameSite Cookie——按「站」决定带不带牌

Cookie 的 SameSite 属性分三档，行为差异巨大：

| 取值 | 同站请求 | 跨站顶级导航 GET | 跨站 POST/表单 | 适用场景 |
| ---- | ---- | ---- | ---- | ---- |
| `Strict` | 带 | 不带 | 不带 | 高敏操作（银行、改密码） |
| `Lax` | 带 | **带** | **不带** | 一般登录态（安全与体验的平衡） |
| `None` | 带 | 带 | 带（必须配 Secure） | 第三方嵌入、SSO 跳转 |

默认值的演变值得记住：**2020 年 Chrome 80 起未声明 SameSite 的 Cookie 默认按 Lax 处理**，Firefox/Edge 相继跟进——老教程里「跨站请求全带 Cookie」的世界已经结束，这也是今天大量 CSRF 在现代浏览器上「打不响」的原因。但两点别放松：Lax 仍放行跨站顶级 GET 导航（GET 类 CSRF 依然要警惕），旧浏览器与特殊环境仍可能全带——所以它是**第一道闸，不是全部**。

### 防线二：CSRF Token——让伪造请求必然缺票

思路：服务器发一张「一次性门票」嵌进本站表单，提交时必须交回。关键问题是 evil.com 能不能偷到票？**不能**——同源策略禁止它读取 bank.com 页面的 DOM，也禁止它向 bank.com 发「能读到响应」的请求；它唯一能做的是盲发，而盲发的请求里没有票。于是：

```text
合法用户：GET /transfer → 表单带 token=abc → POST 带回 abc → 核对通过 ✅
恶意伪造：POST /transfer（无 token 或瞎猜 token）→ 核对失败 → 403 ❌
```

Token 的强度依赖随机性（`secrets.token_urlsafe` 一类），且建议一次性或绑定会话——「用过即废」让重放也失效。

### 与 JWT 的关系：放哪里决定是否免疫

- JWT 放 `Authorization` 头（fetch 手动携带）：浏览器**不会**自动给跨站请求带这个头 → **天然免疫 CSRF**，无需 Token；
- JWT 存进 Cookie（图省事）：回到「自动带牌」的世界 → **照样中招**，SameSite + Token 一个都不能少。

「用了 JWT 所以不用防 CSRF」是最常见的误解——免疫的是**存放位置**（浏览器不自动带），不是 JWT 本身。

## 代码示例

主线任务：在本机用 `localhost` 与 `127.0.0.1` 模拟两个互不信任的站点（浏览器把它们视为**跨站**），依次验证三件事：漏洞版转账被伪造成功 → SameSite=Lax 拦截伪造请求 → CSRF Token 掐死缺票请求。全程约 30 分钟。

### 第 0 步：准备受控实验环境

```bash
pip install fastapi uvicorn python-multipart
mkdir csrf-lab && cd csrf-lab   # 实验目录，结束后可整目录删除
```

约定：`http://localhost:8000` 扮演 bank.com；`http://127.0.0.1:9000` 扮演 evil.com。两者主机名不同（localhost vs IP 字面量），浏览器按跨站处理——正好复现攻击条件，又不碰任何真实域名。

### 第 1 步：漏洞版银行接口（bank.py）

```python
# bank.py —— 漏洞版：只认 Cookie，不验证请求来源
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/login", response_class=HTMLResponse)
def login():
    # 漏洞点①：声明 samesite="none"（实验用它模拟「旧默认」的跨站全带行为）
    resp = HTMLResponse('<a href="/transfer">去转账</a>')
    resp.set_cookie("sid", "sess-888", samesite="none")
    return resp

@app.get("/transfer", response_class=HTMLResponse)
def transfer_form():
    return """
      <form method="post" action="/transfer">
        <input name="to" placeholder="收款人"><input name="amount" placeholder="金额">
        <button type="submit">转账</button>
      </form>"""

@app.post("/transfer")
def transfer(request: Request, to: str = Form(...), amount: float = Form(...)):
    sid = request.cookies.get("sid")              # 漏洞点②：只认 Cookie
    if sid != "sess-888":
        raise HTTPException(401, "未登录")
    return {"msg": f"已向 {to} 转账 {amount} 元"}
```

```bash
uvicorn bank:app --port 8000
```

### 第 2 步：恶意页面（evil.py）

```python
# evil.py —— 攻击者页面：加载即自动提交伪造表单
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def index():
    return """
    <h3>恭喜你抽中大奖（恶意页面）</h3>
    <form action="http://localhost:8000/transfer" method="POST" id="f">
      <input name="to" value="attacker">
      <input name="amount" value="10000">
    </form>
    <script>document.getElementById('f').submit()</script>
    """
```

```bash
uvicorn evil:app --port 9000
```

### 第 3 步：实验 A——复现 CSRF 成功

1. 浏览器先访问 `http://localhost:8000/login` 拿到登录 Cookie；
2. 新标签打开 `http://127.0.0.1:9000/`；
3. 回到 bank 标签看 uvicorn 日志。

预期：日志出现一条 `POST /transfer`，响应 `{"msg": "已向 attacker 转账 10000 元"}`——**你没点任何转账按钮，钱被转走了**。F12 → Network 里可确认该请求自动带了 `Cookie: sid=sess-888`。

> 注：个别浏览器版本会拒绝 http 下无 Secure 的 `SameSite=None`；若实验 A 未带上 Cookie，换 Firefox 复现漏洞版，或改走自签名 HTTPS——现象与结论不变。

### 第 4 步：修复 1——SameSite=Lax 拦截验证

把 bank.py 里的 Cookie 改一行并重启，然后**重新访问 /login 刷新 Cookie**（旧 Cookie 的属性不会自动更新）：

```python
resp.set_cookie("sid", "sess-888", samesite="lax")   # 现代浏览器默认档
```

重复第 3 步。预期：evil 的表单**照常发出** POST，但 uvicorn 日志返回 `401`——Network 里该请求**没有** Cookie 这一行。判读：Lax 档下跨站 POST 不带牌，攻击链第一步就断了；但顶级导航 GET 仍带牌，GET 类写接口别掉以轻心。

### 第 5 步：修复 2——CSRF Token 完整方案

在 SameSite 之上加第二道闸（替换 bank.py 中 /transfer 的两个路由）：

```python
# bank.py 新增/替换 —— CSRF Token：发票 + 验票
import secrets

pending_tokens: set[str] = set()      # 真实项目存加密 session / Redis

@app.get("/transfer", response_class=HTMLResponse)
def transfer_form():
    token = secrets.token_urlsafe(32)          # 每张表单一张新票
    pending_tokens.add(token)
    return f"""
      <form method="post" action="/transfer">
        <input type="hidden" name="csrf_token" value="{token}">
        <input name="to" placeholder="收款人"><input name="amount" placeholder="金额">
        <button type="submit">转账</button>
      </form>"""

@app.post("/transfer")
def transfer(request: Request, csrf_token: str = Form(...),
             to: str = Form(...), amount: float = Form(...)):
    sid = request.cookies.get("sid")
    if sid != "sess-888":
        raise HTTPException(401, "未登录")
    if csrf_token not in pending_tokens:       # 验票：伪造请求必然缺票
        raise HTTPException(403, "CSRF token 无效")
    pending_tokens.discard(csrf_token)         # 一次性：用过即废，防重放
    return {"msg": f"已向 {to} 转账 {amount} 元"}
```

重启后手动走一遍 `GET /transfer` → 填表提交：正常转账成功。再重复第 3 步让 evil 伪造：日志返回 **403 CSRF token 无效**——evil.com 能发请求，却拿不到藏在 bank.com 页面里的那张票（同源策略禁止它读 DOM），伪造请求必然缺票。

### 三段验证对照总结

| 场景 | 关键配置 | 伪造请求结果 |
| ---- | ---- | ---- |
| ❌ 漏洞版 | `samesite="none"`、无 Token | 200，转账成功 |
| ✅ 修复 1 | `samesite="lax"` | 请求发出但不带 Cookie → 401 |
| ✅ 修复 2 | Lax + CSRF Token | 403 CSRF token 无效 |

生产建议：SameSite 与 Token **同时上**——前者挡住绝大多数浏览器环境，后者兜住旧浏览器与策略放宽的角落，纵深防御不二选一。

## 常见坑

1. **坑 1：「我的接口看不见摸不着，安全」**。现象：只给「后台管理页」加了防护，前台接口裸奔。原因：GET 请求用 `<img src=...>` 就能跨站触发，改数据的操作做成 GET 是事故级设计；所有写操作（POST/PUT/DELETE）都要有 CSRF 防护。排查：全量列出写接口，逐一核对防护措施。
2. **坑 2：只上 SameSite 就收工**。现象：现代浏览器安全、旧浏览器/特殊环境被报告 CSRF。原因：Lax 放行跨站顶级 GET 导航，旧浏览器对 None/未声明的 Cookie 按全带处理。排查：确认服务端仍校验 Token，SameSite 只当第一道闸。
3. **坑 3：Token 放进 localStorage 让 JS 读**。现象：Token 方案与 XSS 防线互相拖累。原因：一旦页面存在 XSS，JS 可读的 Token 直接被顺走，叠加防线失效。排查：Token 由服务端注入表单隐藏域或走双提交 Cookie，不进 localStorage。
4. **坑 4：以为用了 JWT 就免疫**。现象：JWT 存 Cookie 的项目被报 CSRF。原因：免疫 CSRF 的是 Authorization 头「浏览器不自动带」这个特性，不是 JWT 本身；JWT 进 Cookie 等于回到射程内。排查：确认凭证存放位置，再决定是否需要 Token。
5. **坑 5：Token 与会话不绑定、永不过期**。现象：Token 泄露后长期可重放。原因：全局静态 Token 等于给攻击者发永久门票。排查：Token 绑定 session、设短时效、一次性使用（用过即废）。

## 小练习

1. 把第 3 步的攻击剧本默画一遍，并在图上标出「浏览器自动带 Cookie」与「服务器只认牌不看人」两个必要条件分别对应哪几步。
2. 把恶意表单改成 GET 提交（`/transfer?to=attacker&amount=10000`），观察漏洞版是否照样触发——解释为什么写操作绝不能用 GET。
3. 给第 5 步加一个「token 已使用过」的用例：同一 token 提交两次，第二次应 403——解释一次性设计防住了什么（提示：重放）。
4. **综合修复任务**：给第 1 步的 bank.py 做全套加固——(a) Cookie 改 Lax + HttpOnly + Secure（本地实验可暂去 Secure 并注明原因）；(b) 所有写接口上 Token 校验；(c) 写一份「漏洞版 → Lax → Lax+Token」三段对照记录（每段 3 行以内），并注明每道防线各自掐断的是哪个必要条件。
