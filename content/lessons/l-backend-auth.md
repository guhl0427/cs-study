---
id: l-backend-auth
slug: auth
title: 认证与授权：Cookie/Session 与 JWT 全对照
difficulty: 2
estMinutes: 85
tags: [认证, 授权, 安全]
summary: HTTP 本身不记得你是谁——登录态的两大方案（Session vs JWT）完整对照、授权与认证的分界、跟着实现一套能跑的登录。
updated: 2026-11-22
resources:
  - id: r-auth-mdn
    title: MDN · HTTP 认证
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Authentication
    type: doc
    difficulty: 2
    note: HTTP 认证机制的权威参考。
  - id: r-jwt-io
    title: JWT 官网（交互式解码器）
    url: https://jwt.io/
    type: tool
    difficulty: 1
    note: 粘贴 token 逐段看结构，本课用它做实验。
---

> 一句话定义：**认证**回答「你是谁」，**授权**回答「你能干什么」——HTTP 无状态，所以每次请求都要带凭证：凭证放服务端是 Session，放客户端签名的是 JWT。

## 概念讲解

**问题根源**：HTTP 每个请求独立，服务器不记得上一个请求是谁发的。登录一次之后怎么让后续请求都「认得你」？唯一的办法是**每次请求携带一张凭证**——两大方案的区别就是凭证存在哪、谁来验证。

**方案一：Cookie + Session（凭证在服务端）**

```text
登录成功 → 服务端生成 session（存在内存/Redis）→ 下发 Set-Cookie: sid=abc
之后每次请求 → 浏览器自动带上 Cookie: sid=abc → 服务端查 session 认人
登出/封禁 → 服务端删掉 session → 凭证立即作废
```

- 优点：**可随时踢人**（删 session 即生效）；凭证对 JS 不可见（HttpOnly Cookie），XSS 偷不走（呼应安全课）。
- 代价：session 存在服务端——多台服务器要共享存储（粘性会话或集中 Redis）；跨域/小程序场景不友好。

**方案二：JWT（凭证在客户端，签名防伪造）**

```text
登录成功 → 服务端签发 JWT（含用户ID、过期时间，密钥签名）→ 前端保存
之后每次请求 → 带上 Authorization: Bearer <token> → 服务端验签即可认人，无需查库
登出 → 客户端删 token（服务端不感知，除非配黑名单）
```

JWT 的三段结构（header.payload.signature），payload 只是 Base64 编码**不是加密**：

```json
{ "header": { "alg": "HS256" },
  "payload": { "sub": "42", "role": "student", "exp": 1767225600 } }
```

- 优点：服务端**无状态**（不用查库验人），天然支持分布式与跨域。
- 代价：**签发后无法主动作废**（只能等过期）；payload 可读（绝不放敏感信息）；token 泄露即被冒用——有效期要短，配合刷新令牌（refresh token）轮换。

**选型决策表**（面试高频）：

| 需求 | 推荐 | 理由 |
| ---- | ---- | ---- |
| 管理员一键封禁、立即生效 | Session | 删 session 即生效；JWT 要配黑名单 |
| 多服务/多端共享登录态 | JWT | 无状态验签，跨域友好 |
| 传统 SSR 网站登录 | Session | Cookie 自动携带，实现最简单 |
| 移动端/小程序 API | JWT（或 Token） | Cookie 机制在非浏览器端别扭 |

**授权在认证之后**：同一个用户，普通用户只能改自己的资料、管理员能改任何人的——这是**在服务端按角色/权限判断**。前端隐藏管理按钮只是体验优化，直接 curl 接口的人看不到你的前端（呼应安全课）。

## 代码示例

主线：用 FastAPI 实现一套完整能跑的「注册 → 登录 → 带凭证访问 → 授权判断」（密码存储呼应安全课的慢哈希）：

```python
# auth_demo.py —— pip install fastapi pydantic passlib[bcrypt]
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt, time

app = FastAPI()
pwd = CryptContext(schemes=["bcrypt"])            # 慢哈希加盐（安全课）
SECRET = "dev-secret"                              # 生产环境从环境变量取
users: dict[str, str] = {}                         # 用户名 → 密码哈希
bearer = HTTPBearer()

def make_token(username: str) -> str:
    payload = {"sub": username, "exp": int(time.time()) + 3600}   # 1 小时过期
    return jwt.encode(payload, SECRET, algorithm="HS256")

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    try:                                           # 验签：改过内容/过期都会抛错
        payload = jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "凭证无效或过期")
    return payload["sub"]

@app.post("/register")
def register(username: str, password: str):
    if username in users:
        raise HTTPException(409, "用户已存在")
    users[username] = pwd.hash(password)           # 只存哈希，永不存明文
    return {"ok": True}

@app.post("/login")
def login(username: str, password: str):
    if username not in users or not pwd.verify(password, users[username]):
        raise HTTPException(401, "用户名或密码错误")  # 统一口令防枚举（安全课）
    return {"token": make_token(username)}

@app.get("/me")
def me(username: str = Depends(current_user)):     # 认证依赖：没带/带错凭证 → 401
    return {"user": username}

@app.delete("/articles/{aid}")
def remove_article(aid: int, username: str = Depends(current_user)):
    if username != "admin":                        # 授权判断：认证通过≠什么都能干
        raise HTTPException(403, "需要管理员权限")
    return {"deleted": aid}
```

```bash
uvicorn auth_demo:app --port 8000
curl -X POST "localhost:8000/register?username=admin&password=pw123"
curl -X POST "localhost:8000/login?username=admin&password=pw123"
# → {"token":"eyJhbGciOiJIUzI1NiIs..."}
curl localhost:8000/me -H "Authorization: Bearer <粘贴token>"   # {"user":"admin"}
curl localhost:8000/me                                          # 401（没带凭证）
```

把 token 粘到 jwt.io 里解码：payload 的 sub/exp 一目了然——亲手验证「payload 可读、签名防改」。

## 常见坑

1. **坑 1：把 JWT 存进 localStorage 就高枕无忧**。localStorage 可被 XSS 读取（安全课）——配合 HttpOnly Cookie 或至少缩短有效期 + refresh token 轮换。
2. **坑 2：敏感信息放进 JWT payload**。payload 是可读的，「签名」只保证没被改、不保证保密——手机号、身份证永远不进 payload。
3. **坑 3：授权判断放在前端**。前端隐藏管理按钮只是体验，后端接口必须再做权限校验——直接 curl 接口的人看不到你的前端。
4. **坑 4：登录失败提示分得太细**。「用户不存在」vs「密码错误」分开提示，攻击者能枚举出哪些账号存在——统一一句「用户名或密码错误」（呼应密码存储课）。
5. **坑 5：token 永不过期**。有效期一年的 token 泄露后等于永久钥匙——短有效期（小时级）+ refresh token 是标准组合。
6. **坑 6：密钥硬编码进代码仓库**。SECRET 提交进 Git = 任何人可伪造 token——从环境变量读取，密钥与代码分离（呼应 CI/CD 课的 secrets）。

## 小练习

1. 走通主线全部四步（注册/登录/带凭证访问/无凭证 401），并用 jwt.io 解码你的 token，指出 payload 里的 sub 与 exp。
2. 故意改 payload 里的 sub 再请求 /me——验证签名机制拒绝伪造的请求，解释为什么改 Base64 骗不过服务器。
3. 综合任务：给 /me 增加一个「普通用户只能看自己、admin 能看任何人」的授权判断（查询参数带 username），用两个账号分别验证 200 与 403。
4. 思考题：产品要求「封禁用户立即生效」但团队已选 JWT——给出两种补救方案的代价对比（黑名单 vs 短有效期+refresh）。
