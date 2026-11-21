---
id: l-backend-auth
slug: auth
title: 认证与授权：Cookie/Session 与 JWT
difficulty: 2
estMinutes: 40
tags: [后端, 认证]
summary: 认证回答「你是谁」，授权回答「你能做什么」——两种主流方案把答案分别存在服务端和令牌里。
updated: 2026-11-22
resources:
  - id: r-auth-mdn
    title: MDN · HTTP Cookie 概述
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies
    type: doc
    difficulty: 2
    note: Cookie 属性（HttpOnly/SameSite/Secure）的权威参考。
---

> 一句话定义：认证（Authentication）确认「你是谁」，授权（Authorization）决定「你能做什么」；Web 里两者通常靠随请求携带的凭证完成。

## 概念讲解

HTTP 本身无状态——服务器不记得上一个请求是谁发的。所以每次请求都要带一张「凭证」，主流方案两种：

**方案一：Cookie + Session（凭证在服务端）**

```
登录 → 服务端生成 session 存起来 → 下发 Set-Cookie: sid=abc
之后每次请求 → 浏览器自动带上 Cookie: sid=abc → 服务端查 session 认人
```

- 优点：服务端可随时踢人下线（删 session 即可）；凭证对前端完全不可见（HttpOnly）。
- 代价：session 存在服务端——多台服务器要共享存储；跨域/小程序场景不友好。

**方案二：JWT（凭证在客户端）**

```
登录 → 服务端签发 JWT（含用户ID、过期时间，用密钥签名）→ 前端保存
之后每次请求 → 带上 Authorization: Bearer <token> → 服务端验签即可认人，无需查库
```

- 优点：服务端无状态，天然支持分布式与跨域。
- 代价：签发后**无法主动作废**（只能等过期）；token 泄露即被冒用——有效期要短，配合刷新令牌。

**授权**在认证之后：同一个用户，普通用户只能改自己的资料，管理员能改任何人的——这是在代码里按角色/权限判断，别和认证混为一谈。

## 代码示例

JWT 的结构与验签，用现成工具看一次：

```bash
# 一段典型的 JWT：三段 Base64，用 . 连接
# header.payload.signature
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.xxx" \
  https://api.example.com/me
```

```json
{
  "header": { "alg": "HS256" },
  "payload": {
    "sub": "42",
    "role": "student",
    "exp": 1767225600
  }
}
```

payload 只是 Base64 编码，**不是加密**——任何人都能解开看，所以 token 里绝不放敏感信息。防伪造靠的是第三段签名：服务端用密钥验证 payload 没有被改过。

## 常见坑

1. **坑 1：把 JWT 存进 localStorage 就高枕无忧**。localStorage 可被 XSS 读取；配合 HttpOnly Cookie 或至少缩短有效期 + refresh token 轮换。
2. **坑 2：敏感信息放进 JWT payload**。payload 是可读的，「签名」只保证没被改，不保证保密。
3. **坑 3：授权判断放在前端**。前端隐藏管理按钮只是体验，后端接口必须再做权限校验——直接 curl 接口的人看不到你的前端。

## 小练习

1. 对比两种方案：如果产品要求「管理员一键封禁用户并立即生效」，选哪个？为什么？
2. 用浏览器开发者工具观察一次登录：Cookie 的哪些属性（HttpOnly/SameSite）被设置了？
3. 思考题：为什么 JWT 的 payload 不能加密就可以保证「不被伪造」？
