---
id: l-sec-password
slug: sec-password
title: 密码存储与鉴权安全
difficulty: 3
estMinutes: 40
tags: [安全, 认证, 后端]
summary: 明文存密码是事故，MD5 也不是加密——慢哈希加盐（bcrypt/argon2）是唯一正确答案，会话与凭证管理是第二条战线。
updated: 2026-11-22
resources:
  - id: r-owasp-auth-cheatsheet
    title: OWASP · Authentication Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
    type: doc
    difficulty: 3
    note: 认证安全 checklist 的权威出处，本节内容大半出自它。
  - id: r-bcrypt-doc
    title: passlib（Python 密码哈希库）
    url: https://passlib.readthedocs.io/en/stable/
    type: doc
    difficulty: 2
    note: 一行 API 正确使用 bcrypt，别手搓密码学。
---

> 一句话定义：密码入库前必须过**慢哈希加盐**（bcrypt/argon2）——慢是故意的，盐是防彩虹表的；泄露事故的伤亡大小，在存储那一刻就决定了。

## 概念讲解

先排除三个错误答案：

1. **明文存储**：数据库一泄 = 全部密码裸奔（用户在别处用同密码，连带沦陷）；
2. **MD5/SHA256**：计算快是「通用哈希」的优点，却是密码哈希的致命缺点——GPU 一秒算几十亿次，撞库成本趋近于零；
3. **加密**：加密可逆，密钥泄露=全泄。密码只需要**验证**（「输入的是否等于当初那个」），不需要还原——所以用不可逆的哈希。

正确的工具是**密码哈希算法**（bcrypt / argon2 / PBKDF2），两个特性专门为密码设计：

- **慢**：故意设计成单次几十毫秒——用户登录感觉不到，攻击者跑字典每条都要付这个成本，撞库慢百万倍；
- **加盐**：每个密码配一段随机盐，同样的密码哈希出不同的结果——预计算的「彩虹表」直接失效。bcrypt 的输出串自带盐和成本参数，**不需要自己拼**。

```text
bcrypt 输出：$2b$12$KIXQe2...（算法$成本$盐+哈希）——整串存库，验证用同一 API
```

会话侧的安全（呼应认证授权一课）：

| 措施 | 防什么 |
| ---- | ---- |
| 密码错误次数限制 + 退避 | 暴力撞库 |
| Session ID 足够随机、登录后轮换 | 会话固定攻击 |
| HttpOnly / Secure / SameSite Cookie | XSS 偷凭证 / 明文传输 / CSRF |
| 登出即销毁服务端 session | 凭证残留 |

## 代码示例

用 passlib 实现「注册存哈希 + 登录验证」的标准流程：

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 注册：明文密码 → 哈希入库（盐自动生成并编码在结果里）
def register(name: str, password: str):
    hashed = pwd_context.hash(password)     # 每次调用结果都不同（盐随机）
    db[name] = hashed
    return hashed
# $2b$12$KIXQe2Zj... 和 $2b$12$9m4Vv8pQ... —— 同一密码，两个不同的串

# 登录：取哈希 → verify 对比（不是解密！）
def login(name: str, password: str) -> bool:
    return pwd_context.verify(password, db[name])

print(login("alice", "right-pwd"))   # True
print(login("alice", "wrong-pwd"))   # False
```

强制密码策略 + 撞库限速的骨架：

```python
import time

def login_throttled(name: str, password: str) -> bool:
    if fail_count[name] >= 5:                 # 连错 5 次
        time.sleep(2 ** fail_count[name])     # 指数退避：让撞库贵到不可行
    ok = login(name, password)
    fail_count[name] = 0 if ok else fail_count[name] + 1
    return ok
```

## 常见坑

1. **坑 1：自己拼「MD5(盐+密码)」**。快哈希+自拼盐是上个时代的方案——单次计算太快，GPU 依然跑得飞起。用 bcrypt/argon2 的现成 API，成本参数（rounds）交给库管理。
2. **坑 2：把「密码规则复杂」当安全**。`P@ssw0rd1` 满足一切规则但撞库字典第一名。更好的策略是**长度优先 + 禁常见口令**（对照 Have I Been Pwned 一类泄露库检查）。
3. **坑 3：验证失败的原因说太细**。「用户不存在」vs「密码错误」分开提示，攻击者能枚举出哪些账号存在——统一一句「用户名或密码错误」。
4. **坑 4：忘了「登录后轮换 session」**。登录成功时旧 Session ID 继续用，会话固定攻击得手——成功登录后生成新 session。

## 小练习

1. 用 passlib 对同一密码 hash 两次，对比两个输出串——解释为什么不同但 verify 都返回 True。
2. 把 bcrypt 的成本参数从 12 调到 4，用 `timeit` 测量单次 hash 耗时差，估算这对攻击者意味着什么。
3. 思考题：「认证授权」一课说 JWT 签发后无法主动作废——结合本课的会话管理，设计一个「改密码后强制全部下线」的方案。
