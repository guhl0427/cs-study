---
id: l-sec-password
slug: sec-password
title: 密码存储与鉴权安全
difficulty: 3
estMinutes: 85
tags: [安全, 认证, 后端]
summary: 先排除明文/快哈希/加密三个错误答案——慢哈希加盐是唯一正解：慢是故意的（用户无感、攻击者百万倍成本），盐让彩虹表失效；主线用 passlib 跑通注册存哈希→验证→成本实测→限流退避→会话加固的完整可跑流程。
updated: 2026-11-22
resources:
  - id: r-owasp-auth-cheatsheet
    title: OWASP · Authentication Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
    type: doc
    difficulty: 3
    note: 认证安全 checklist 的权威出处，本节内容大半出自它。
  - id: r-owasp-pwd-storage
    title: OWASP · Password Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
    type: doc
    difficulty: 3
    note: 密码存储专项：算法选择、成本参数、盐的权威建议。
  - id: r-bcrypt-doc
    title: passlib（Python 密码哈希库）
    url: https://passlib.readthedocs.io/en/stable/
    type: doc
    difficulty: 2
    note: 一行 API 正确使用 bcrypt，别手搓密码学。
---

> 一句话定义：密码入库前必须过**慢哈希加盐**（bcrypt/argon2）——慢是故意的：用户登录无感，攻击者撞库成本放大百万倍；盐让预计算彩虹表直接失效。泄露事故的伤亡大小，在存储那一刻就决定了。

## 概念讲解

### 先排除三个流行错误答案

写「注册/登录」功能时，90% 的事故出在存储方案选错。逐个排除：

**错误答案 1：明文存储**

```text
事故剧本：数据库被拖 → 全部密码裸奔 → 用户在别处复用同密码 → 邮箱/支付账号连带沦陷
```

后果最重且毫无争议——任何「方便找回」「方便调试」的理由都不成立。

**错误答案 2：MD5/SHA256（快哈希）**

「加个哈希总安全了吧？」——方向对了，工具错了。MD5/SHA256 为通用场景设计，**计算快是它们的优点**（校验大文件、做缓存键），却是密码哈希的致命缺点：

```text
GPU 撞库速度：MD5 ≈ 数十亿次/秒（单卡）
8 位纯数字密码：全空间遍历 < 1 秒
8 位大小写+数字：分钟级
```

泄露事故里，攻击者拿哈希表回家慢慢跑——快哈希等于没锁门。

**错误答案 3：加密（AES 等）**

加密**可逆**：解密需要密钥，而密钥必然存在应用配置/环境变量里——密钥与密文常常一起泄露（同一次拖库、同一个配置仓库）。密码场景只需要**验证**「输入的是否等于当初那个」，从不需要还原原文——所以选不可逆的哈希，加密在这里是用错了工具。

### 正确答案：慢哈希 + 盐，两个特性都是故意的

密码哈希算法（bcrypt/argon2/PBKDF2）专为「验证次数极少、攻击尝试极多」的不对称场景设计：

**特性 1：慢（成本因子）**

| | 用户 | 攻击者 |
| ---- | ---- | ---- |
| 单次计算 | 一次登录 ≈ 0.2s，无感 | 每个字典候选都要付 0.2s |
| 百万次尝试 | 一辈子遇不到 | 快哈希：分钟级；bcrypt(12)：月～年级（单卡） |

设计哲学一句话：**把成本从「用户每天付」挪到「攻击者海量付」**——用户无感，撞库成本放大百万倍。成本参数还能随硬件升级上调（bcrypt 的 rounds、argon2 的 memory/iterations），这是快哈希给不了的可调防御。

**特性 2：盐（salt）**

```text
无盐：hash("123456") 固定 → 攻击者预计算整张「彩虹表」→ 查表即破解，连 GPU 都不用
加盐：hash(随机盐 + "123456") → 同一密码每次哈希结果都不同 → 预计算失效，只能逐条慢算
```

盐不需要保密（它就存在哈希串里），价值在**随机且每用户独立**：让「同样的密码」在库里长成两串完全不同的密文——攻击者无法批量比对谁与谁同密码，也无法提前计算。

### bcrypt 输出结构解剖：为什么不需要自己拼盐

```text
$2b$12$KIXQe2Zj8kQv7m4Vv8pQeu9cXoQhYbGnKqF2sT3uVw5xYy6zA7B2C
 │  │  └──────────── 22 字符盐 + 31 字符哈希（base64）──────────┘
 │  └ 成本因子 12 = 2^12 = 4096 轮
 └ 算法标识（2a/2b 是 bcrypt 的版本号）
```

一串里自带**算法标识、成本参数、盐、哈希**四样信息——存库时整串存，验证时库直接从串里读出盐与成本，用同样参数重算一遍比对。**盐的生成、存储、传递全部由库管理**，这也是「不要手搓密码学」的具体含义：自己拼 `md5(salt+pwd)` 的时代方案，错在把已经解决的问题又亲手做错一遍。

### 成本参数怎么选：用实测说话

bcrypt 成本每 +1，耗时翻倍（2^n 轮）。选型方法不是背数字，是**实测**：让单次验证落在 100-350ms 区间（OWASP 建议）——用户登录无感，攻击者已痛不欲生；硬件升级后逐步调高，旧哈希可在用户登录时顺手 rehash（passlib 自动处理）。

### 第二条战线：会话与凭证管理

存储防的是「拖库后的伤亡」，会话防的是「在线期间的滥用」。清单如下：

| 措施 | 防什么 | 不做的后果 |
| ---- | ---- | ---- |
| 登录失败限流 + 指数退避 | 在线暴力撞库 | 攻击者可无限次试密码 |
| 登录成功后轮换 Session ID | 会话固定攻击 | 攻击者预设的旧 ID 继续生效 |
| 统一提示「用户名或密码错误」 | 账号枚举 | 分开提示让攻击者批量摸出真实账号 |
| HttpOnly + Secure + SameSite Cookie | XSS 偷凭证 / 明文传输 / CSRF | 凭证被脚本读走或跨站借用 |
| 登出销毁服务端 session | 凭证残留 | 「退出登录」只是删了本地 Cookie |

注意这些全是**与密码算法无关**的工程措施——认证安全是「存储 + 会话」两条战线，缺一不可。

## 代码示例

主线任务：用 passlib 完整跑通「注册验证 → 成本实测 → 限流退避 → 会话加固」四步，全部代码可直接复制运行。全程约 35 分钟。

### 第 0 步：准备实验环境

```bash
pip install "passlib[bcrypt]" "bcrypt==4.0.1"
# 注：passlib 1.7.4 与 bcrypt 4.1+ 存在版本探测兼容告警，锁 4.0.1 最省心
mkdir pwd-lab && cd pwd-lab       # 实验目录，结束后可整目录删除
```

### 第 1 步：注册与验证——存哈希，亲眼看盐的随机性（auth_basic.py）

```python
# auth_basic.py —— 注册存哈希 + 登录验证：verify 是比对，不是解密
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db: dict[str, str] = {}                        # 模拟 users 表：name → 哈希串

def register(name: str, password: str) -> str:
    hashed = pwd_context.hash(password)        # 盐自动生成并编进结果串
    db[name] = hashed                          # 真实项目：INSERT INTO users
    return hashed

def login(name: str, password: str) -> bool:
    return pwd_context.verify(password, db[name])   # 按串里的盐+成本重算再比对

# 同一密码注册两次：库里长出两串完全不同的哈希——这就是盐的随机性
print(register("alice", "S3cure-Pass!"))       # $2b$12$KIXQe2Zj...（60 字符）
print(register("bob",   "S3cure-Pass!"))       # $2b$12$9m4Vv8pQ...（另一串，互不相关）
print(login("alice", "S3cure-Pass!"))          # True
print(login("alice", "wrong-pwd"))             # False —— 哈希不可逆，只能重算比对
```

判读：两人密码相同，库里却是两串无关的密文——攻击者看不出谁与谁同密码，彩虹表无处下手；`verify` 不是「解密比对明文」，而是「用串里的盐和成本把输入重算一遍再比对」，库里从头到尾没有明文。**验证时不需要你记盐**，它就在串里。

### 第 2 步：成本参数实测——「慢」到底慢多少（cost_bench.py）

```python
# cost_bench.py —— bcrypt rounds 4/8/12 的单次耗时对比
import timeit
from passlib.context import CryptContext

PWD = "S3cure-Pass!"
for rounds in (4, 8, 12):
    ctx = CryptContext(schemes=["bcrypt"], bcrypt__rounds=rounds)
    h = ctx.hash(PWD)
    t = min(timeit.repeat(lambda: ctx.verify(PWD, h), number=1, repeat=3))
    print(f"rounds={rounds}: {t*1000:.1f} ms")
```

参考输出（因机器而异）：

```text
rounds=4:  1.8 ms
rounds=8: 21.6 ms
rounds=12: 244.3 ms
```

判读：每 +1 轮耗时翻倍。rounds=4 时攻击者每秒能试上万条，rounds=12 时每条 0.25 秒——**「用户无感」与「攻击者百万倍成本」的平衡点就在这个参数上**。上线取实测落在 100-350ms 的值。

### 第 3 步：限流退避——在线撞库的成本引擎（throttle.py）

```python
# throttle.py —— 登录失败限流 + 指数退避（内存版骨架）
import time
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = {"alice": pwd_context.hash("S3cure-Pass!")}
fail_count: dict[str, int] = {}
LOCK_THRESHOLD = 5                      # 连错 5 次开始退避

def login(name: str, password: str) -> bool:
    fails = fail_count.get(name, 0)
    if fails >= LOCK_THRESHOLD:
        wait = min(2 ** (fails - LOCK_THRESHOLD + 1), 300)  # 指数退避，封顶 5 分钟
        print(f"[退避] 该账号已连错 {fails} 次，需等待 {wait}s")
        time.sleep(wait)                 # 真实项目：按账号+IP 双维度在中间件里做
    stored = db.get(name)
    if stored:
        ok = pwd_context.verify(password, stored)
    else:
        pwd_context.dummy_verify(password)  # 用户不存在也对一次假哈希：耗时对齐防枚举
        ok = False
    fail_count[name] = 0 if ok else fails + 1
    return ok

# 模拟连续输错 7 次
for i in range(7):
    print(i + 1, login("alice", "guess-wrong"))
print("正确密码再试：", login("alice", "S3cure-Pass!"))   # True，失败计数清零
```

判读：连错后每次尝试要等 2s、4s、8s……暴力撞库从「每秒千次」被压到「每几分钟一次」。`dummy_verify` 那一手是细节中的细节：**用户不存在也走一遍慢验证**，让两种失败的响应时间一致，不给枚举留时间侧信道。

### 第 4 步：统一提示 + 登录后轮换会话（session_hard.py 骨架）

```python
# session_hard.py —— FastAPI 骨架：认证侧的会话加固
import secrets
from fastapi import FastAPI, Response

app = FastAPI()
sessions: dict[str, str] = {}            # sid → username（真实项目存 Redis）

@app.post("/login")
def do_login(ok: bool, response: Response):
    if not ok:
        # 统一提示：绝不区分「用户不存在」与「密码错误」
        response.status_code = 401
        return {"msg": "用户名或密码错误"}
    sid = secrets.token_urlsafe(32)      # 登录成功 → 全新 Session ID（轮换）
    sessions[sid] = "alice"
    response.set_cookie("sid", sid, httponly=True, samesite="lax", secure=True)
    return {"msg": "登录成功"}

@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("sid")        # 生产环境还要 sessions.pop(sid) 销毁服务端
    return {"msg": "已退出"}
```

判读：登录即换新牌（防会话固定），错误提示一句话（防枚举），Cookie 三件套（呼应 XSS/CSRF 两课）。

### 全流程对照总结

| 环节 | ❌ 错误做法 | ✅ 正确做法 |
| ---- | ---- | ---- |
| 存储 | 明文 / MD5 / 加密 | bcrypt/argon2 慢哈希（自带盐） |
| 成本 | 默认值拍脑袋 | timeit 实测落在 100-350ms |
| 撞库防护 | 无 | 限流 + 指数退避（账号+IP） |
| 错误提示 | 分开说「用户不存在」 | 统一「用户名或密码错误」+ 耗时对齐 |
| 会话 | 旧 Session ID 继续用 | 登录后轮换 + 登出销毁 |

## 常见坑

1. **坑 1：自己拼「MD5(盐+密码)」**。现象：自研「加盐 MD5」被拖库后快速撞穿。原因：快哈希单次太快，GPU 照样飞起；自拼盐还常犯固定盐/短盐错误。排查：全库搜 `md5`/`sha1`/`sha256` 出现在密码路径的调用，一律换 passlib/argon2 的现成 API。
2. **坑 2：把「密码规则复杂」当安全**。现象：强制大小写+符号，用户写出 `P@ssw0rd1`。原因：规则复杂度≠抗撞库，撞库字典第一条就是它。排查：长度优先（≥10）、禁常见口令（对接泄露库查询）、开启 MFA——比堆规则有效得多。
3. **坑 3：验证失败的原因说太细**。现象：登录接口被批量探测，真实账号清单泄露。原因：「用户不存在」与「密码错误」分开提示=枚举接口。排查：统一提示文案，且两分支耗时对齐（不存在也过一遍哈希）。
4. **坑 4：忘了登录后轮换 Session ID**。现象：会话固定攻击报告。原因：登录前后同一个 ID，攻击者预先种下的 ID 登录后依然有效。排查：登录成功处生成新 sid 并作废旧 sid。
5. **坑 5：成本参数常年默认值**。现象：三年没调过 rounds。原因：硬件（GPU）逐年变快，当年合理的成本如今偏弱。排查：定期复测耗时，登录时用 passlib 的 rehash 机制平滑升级旧哈希。

## 小练习

1. 对同一密码 hash 三次，对比三个输出串——解释「为什么每次都不同、但 verify 全部返回 True」，并指出盐分别藏在串里的哪一段。
2. 把成本参数调到 4 与 16，用 timeit 各测一次，按「每 +1 轮耗时翻倍」验证结果；再估算 rounds=16 时攻击者单卡跑完 100 万条字典要多久。
3. 给第 3 步的限流加上「按 IP 维度」的第二层计数（同 IP 一分钟最多 20 次尝试），并说明它防的是「单账号退避」防不住的什么攻击（提示：分布式撞库）。
4. **综合修复任务**：把第 1-4 步组装成完整的 `auth.py`——(a) 注册存 bcrypt 哈希；(b) 登录含限流退避 + 统一提示 + 耗时对齐；(c) 登录成功轮换 Session ID 并下发 HttpOnly Cookie；(d) 用 timeit 记录一次「成本参数选型」的实测结论（3 行以内）。
