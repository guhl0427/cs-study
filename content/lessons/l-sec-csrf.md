---
id: l-sec-csrf
slug: sec-csrf
title: CSRF：借你的身份发请求
difficulty: 3
estMinutes: 35
tags: [安全, 后端]
summary: CSRF 攻击者不偷凭证、只「借用」——浏览器自动带 Cookie 的习惯被恶意网站利用；SameSite + CSRF Token 是标准双保险。
updated: 2026-11-22
resources:
  - id: r-owasp-csrf
    title: OWASP · Cross-Site Request Forgery (CSRF)
    url: https://owasp.org/www-community/attacks/csrf
    type: doc
    difficulty: 3
    note: 攻击原理与防御措施清单的权威出处。
  - id: r-mdn-samesite
    title: MDN · Set-Cookie SameSite
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Set-Cookie
    type: doc
    difficulty: 2
    note: SameSite 属性的现代浏览器默认行为，CSRF 防御的第一道闸。
---

> 一句话定义：CSRF（跨站请求伪造）= 恶意网站**借用你浏览器里已有的 Cookie**，在用户不知情时发出「看起来合法」的请求——攻击者从不需要知道密码。

## 概念讲解

关键机制在浏览器：你登录过 bank.com，浏览器存了它的登录 Cookie，**之后任何请求发往 bank.com 都会自动带上它**——不管这个请求是你点的，还是恶意网页伪造的。

攻击剧本（用户已登录银行网站的前提下）：

```text
1. 用户打开恶意网页 evil.com
2. 页面里藏着一个自动提交的表单（或 img/fetch）：
   <form action="https://bank.com/transfer" method="POST">
     <input name="to" value="attacker">
     <input name="amount" value="10000">
   </form>  → 页面加载即提交
3. 浏览器向 bank.com 发 POST，自动带上登录 Cookie
4. 银行一看：Cookie 合法、来自用户浏览器 → 转账成功
```

注意 CSRF 和 XSS 的区别：XSS 是「往你的页面塞代码」；CSRF 什么都不注入，**只是触发了一个带凭证的请求**。所以防御思路不同——XSS 靠转义，CSRF 靠「证明请求来自你自己的站点」。

两道标准防线：

1. **SameSite Cookie**：`Set-Cookie: sid=abc; SameSite=Lax; HttpOnly`——Lax 模式下跨站请求不带 Cookie（现代浏览器的默认值），直接掐断跨站借凭证的通道；
2. **CSRF Token**：服务端把随机 token 塞进表单隐藏域，提交时核对——evil.com 拿不到你自己站点下的 token（同源策略保证），伪造的表单必然缺票。

## 代码示例

FastAPI 里的一套最小 CSRF Token 方案：

```python
import secrets
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse

app = FastAPI()
pending_tokens: dict[str, None] = {}    # 真实项目存 session/Redis

@app.get("/transfer", response_class=HTMLResponse)
def transfer_form(request: Request):
    token = secrets.token_urlsafe(32)            # 每次表单生成新 token
    pending_tokens[token] = None
    return f"""
      <form method="post" action="/transfer">
        <input type="hidden" name="csrf_token" value="{token}">
        <input name="to"><input name="amount">
        <button type="submit">转账</button>
      </form>"""

@app.post("/transfer")
def transfer(request: Request, csrf_token: str = Form(...), to: str = Form(...), amount: float = Form(...)):
    if csrf_token not in pending_tokens:         # 核对票据
        raise HTTPException(403, "CSRF token 无效")
    pending_tokens.pop(csrf_token)               # 一次性：用过即废
    return {"to": to, "amount": amount}
```

Cookie 侧的配套（呼应认证授权一课）：

```text
Set-Cookie: sid=abc; SameSite=Lax; HttpOnly; Secure; Path=/
```

## 常见坑

1. **坑 1：「我的接口看不见摸不着就安全」**。GET 也能触发 CSRF（img 标签就能发）——改数据的操作绝不能用 GET（呼应 REST 一课），且所有 POST/PUT/DELETE 都要有 CSRF 防护。
2. **坑 2：Token 存在 localStorage 里给 JS 读**。CSRF token 应该由服务端放进表单或 cookie（SameSite=Strict），一旦能被 XSS 读到，防线叠加就失效了。
3. **坑 3：以为 JWT 天然免疫 CSRF**。JWT 放 Authorization 头（浏览器不自动带）确实免疫；但很多人把 JWT 存进 Cookie——那就回到了 CSRF 的射程内，防护一个都不能少。
4. **坑 4：SameSite 依赖单一**。Lax 是浏览器默认，但旧浏览器、部分场景（顶级导航 POST）仍可能放行——SameSite 是第一道闸，CSRF Token 是第二道，纵深防御不二选一。

## 小练习

1. 画出攻击剧本的时序图，标注哪一步「浏览器自动带 Cookie」是攻击成立的必要条件。
2. 把示例表单的 hidden token 去掉再提交，验证 403；再解释为什么 evil.com 无法提前拿到有效 token。
3. 思考题：纯前后端分离 + JWT 放 Authorization 头的项目，还需要 CSRF Token 吗？为什么？
