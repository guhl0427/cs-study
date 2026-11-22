---
id: l-sec-sql-injection
slug: sec-sql-injection
title: SQL 注入：字符串拼接的经典事故
difficulty: 3
estMinutes: 85
tags: [安全, 数据库]
summary: 用户数据混进 SQL 语法——逐字符解剖 `' OR '1'='1' --` 如何改写 WHERE，sqlite3 三写法对照实验（拼接/参数化/ORM）完整复现，参数化「骨架与数据分开」的原理、白名单排序接口与报错脱敏一次讲透。
updated: 2026-11-22
resources:
  - id: r-owasp-sqli
    title: OWASP · SQL Injection
    url: https://owasp.org/www-community/attacks/SQL_Injection
    type: doc
    difficulty: 3
    note: OWASP 榜单常年的头部漏洞，原理与案例。
  - id: r-owasp-sqli-cs
    title: OWASP · SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
    type: doc
    difficulty: 3
    note: 防御清单：参数化、白名单、最小权限、报错脱敏。
  - id: r-sqlalchemy-params
    title: SQLAlchemy · Using Textual SQL
    url: https://docs.sqlalchemy.org/en/20/tutorial/dbapi_transactions.html#tutorial-executing-text
    type: doc
    difficulty: 2
    note: 即使写原生 SQL，ORM 里也能用参数绑定。
---

> 一句话定义：SQL 注入 = 攻击者的输入被**拼进 SQL 当语法执行**——`' OR '1'='1' --` 绕过登录、恶意载荷拖库毁库；解法只有一个词：参数化。

## 概念讲解

### 拼接版逐字符解剖：一个引号如何改写整条 WHERE

登录校验的危险写法，是把用户输入直接拼进 SQL 字符串：

```python
# ❌ 危险：字符串拼接
sql = f"SELECT * FROM users WHERE name='{name}' AND pwd='{pwd}'"
```

正常输入 `name=alice` 时一切正常。攻击者把**单引号当逃逸符**，在用户名框输入 `' OR '1'='1' --`，逐字符看拼接结果：

```text
输入：  '  OR  '1'='1'  --
        │        │        │
   ① 第一个 '     ② OR '1'='1  ③ -- 注释掉后面
   关闭程序员     新增恒真条件    程序写的密码条件
   开的引号       改写 WHERE 语义  （清场）
```

拼出来的 SQL 变成：

```sql
SELECT * FROM users WHERE name='' OR '1'='1' --' AND pwd='whatever'
--                              ↑ 程序写的后半段被注释清场
-- 等价于：WHERE name='' OR '1'='1'  → 恒真 → 全表返回 → 登录绕过
```

三个细节值得咀嚼：

1. 攻击载荷利用的「引号」是**程序自己写进模板的**——输入只是普通字符，是拼接让它获得了语法身份；
2. 别小看 `--`：SQL 里 AND 优先级高于 OR，不清场的话 `OR '1'='1' AND pwd='x'` 可能整体为假——**经典载荷几乎都带注释，或同时注入两个字段**，就是为处理优先级；
3. 换个载荷就是另一种事故：`alice' --` 直接注释掉密码条件（知道用户名就能登录）；UNION SELECT 能拖库；恶意 UPDATE/DELETE 能改库毁库。

### 与 XSS 同构：同一类边界混淆

| | SQL 注入 | XSS |
| ---- | ---- | ---- |
| 混淆现场 | 数据 → SQL 语法 | 数据 → HTML/JS 代码 |
| 逃逸符 | 单引号 `'` | `<`、引号、事件属性 |
| 直接受害者 | 数据库与后端数据 | 浏览页面的其他用户 |
| 结构性解法 | 参数化查询 | 输出转义 / 框架插值 |

解法哲学也相同：**不是过滤「坏字符」，而是让数据在结构上永远当不成代码**。

### 参数化查询的原理：骨架与数据分开传输

参数化（Prepared Statement）把一条 SQL 拆成两次交互：

```text
① 先发骨架：SELECT * FROM users WHERE name=? AND pwd=?
   数据库解析、编译、生成执行计划 —— 结构就此定死
② 再发数据：('alice', 'pw123')
   原样填进占位符 —— 只当「字符串值」，永不参与语法解析
```

输入 `' OR '1'='1' --` 走这条路时，它从头到尾只是 name 的**一个字符串值**：查询会找「名字恰好叫这串字符的用户」，查不到就是查不到。混淆在结构上不可能发生——这不是过滤打补丁，而是**把「代码」与「数据」的通道彻底分开**。驱动若采用转义实现，`'` 会被安全转义（或走协议级绑定根本不经过文本解析）——两条路线殊途同归。

### 为什么「过滤关键词」不是解法

第一个直觉是「把 SELECT、OR、引号过滤掉」。它失败在两点：

1. **编码绕过无穷**：OR 写成 `/**/OR`、`oR`、hex 编码，再叠一层 URL 编码、Unicode 变体……黑名单在枚举攻击手法，手法层出不穷；
2. **误伤正常输入**：密码含撇号的用户（`it's a secret`）被拼炸或拒之门外；昵称叫 `O'Brien` 的真人永远注册不上。

对比一下结构差异：过滤是在**数据侧**辨认「像不像代码」，参数化是在**通道侧**保证「永远只是数据」——前者打地鼠，后者一劳永逸。

### 动态表名/排序字段：占位符失效的地方，用白名单

`WHERE name=?` 可以参数化，但 `ORDER BY ?`、`FROM ?` **不能**——表名、列名是**标识符**（结构的一部分），不是值，占位符在语义上就说不通。这类需求唯一正确的写法是**白名单映射**：

```python
# 用户只能从固定集合里「选」，永远不能「写」
ORDER_COLUMNS = {"views": "view_count", "date": "created_at", "title": "title"}
column = ORDER_COLUMNS.get(user_input)          # 不在名单内 → 拒绝
```

标识符只能出自程序员的固定字典，用户的输入只决定「选哪一个键」——攻击面直接清零。

### 两个辅助危害：报错泄露与 ORM 假安全

- **报错信息泄露**：把 SQL 异常原样返回前端（`column "pwd" does not exist near ...`），等于把表结构、SQL 片段发给攻击者当地图——注入常常靠报错回显逐步摸清库结构。异常记服务端日志，对外一律通用错误页。
- **ORM 的保护边界**：SQLAlchemy/GORM/MyBatis 的日常 API 全是参数化的——这是「用 ORM 防注入白送」的底层原因；但边界是「**你走它的参数化 API**」。一旦 `session.execute(f"...{name}")`、f-string 混进 text()，保护立刻清零——ORM 不是护身符，是「默认安全的通道」。

## 代码示例

主线任务：用 Python 标准库 sqlite3 在内存库上做**三写法对照实验**（拼接/参数化/ORM），逐条复现注入成功与失效；再实现白名单排序接口与报错脱敏。全程约 35 分钟，全部在受控本地环境。

### 第 0 步：准备实验环境

```bash
pip install sqlalchemy fastapi uvicorn python-multipart   # 仅实验 C/D 需要
mkdir sqli-lab && cd sqli-lab    # 实验目录，结束后可整目录删除
```

### 第 1 步：实验 A——拼接版，注入成功（vuln.py）

```python
# vuln.py —— ❌ 漏洞版：登录校验用 f-string 拼接
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, pwd TEXT)")
conn.executemany("INSERT INTO users VALUES (?,?)",
                 [("alice", "pw123"), ("bob", "pw456")])

def login(name, pwd):
    sql = f"SELECT * FROM users WHERE name='{name}' AND pwd='{pwd}'"
    print("实际执行的 SQL：", sql)
    rows = conn.execute(sql).fetchall()
    return len(rows) > 0                    # 查到行 = 登录成功

print(login("alice", "pw123"))              # True —— 正常登录

# 载荷 1：逃逸 + 恒真条件 + 注释清场（处理 AND 优先级）
print(login("' OR '1'='1' --", "any"))      # True —— 无需密码，登录绕过！

# 载荷 2：知道用户名，注释掉密码条件
print(login("alice' --", "wrong-pwd"))      # True —— 密码错了也能登录

# 载荷 3（其实是「正常输入」）：用户名含撇号的真实用户
try:
    login("o'keefe", "pw")
except Exception as e:
    print("正常输入把 SQL 拼炸：", type(e).__name__)   # OperationalError
```

运行 `python vuln.py`，对照打印出的 SQL 逐条判读：载荷 1 拼出 `WHERE name='' OR '1'='1' --' AND pwd='any'`，注释清场后 WHERE 恒真、全部行返回；载荷 2 直接绕过密码；载荷 3 证明拼接版连正常用户都会误伤——**一行代码没改，登录被绕过、正常用户被拒**。

### 第 2 步：实验 B——参数化版，载荷失效（fixed.py）

```python
# fixed.py —— ✅ 修复版：骨架与数据分开
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, pwd TEXT)")
conn.executemany("INSERT INTO users VALUES (?,?)",
                 [("alice", "pw123"), ("bob", "pw456")])

def login(name, pwd):
    # ? 占位：骨架先定死，数据后到达，永远只是值
    rows = conn.execute(
        "SELECT * FROM users WHERE name=? AND pwd=?", (name, pwd)
    ).fetchall()
    return len(rows) > 0

print(login("alice", "pw123"))              # True —— 正常登录不受影响
print(login("' OR '1'='1' --", "any"))      # False —— 载荷成了普通字符串
print(login("alice' --", "wrong-pwd"))      # False —— 同样失效
print(login("o'keefe", "pw"))               # False —— 含撇号输入也不报错、不混淆
```

预期输出：后三个全是 False。判读：注入载荷全程只被当作 name 的字面值——数据库在找「名字恰好叫 `' OR '1'='1' --`」的用户，查无此人。**同一载荷，通道变了，事故消失，正常怪输入也安然无恙。**

### 第 3 步：实验 C——ORM 对照：默认安全，混拼失效（orm.py）

```python
# orm.py —— SQLAlchemy：默认参数化 vs f-string 混进 text()
from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///:memory:")
with engine.begin() as conn:
    conn.execute(text("CREATE TABLE users (name TEXT, pwd TEXT)"))
    conn.execute(text("INSERT INTO users VALUES ('alice', 'pw123')"))
    conn.execute(text("INSERT INTO users VALUES ('bob', 'pw456')"))

attack = "' OR '1'='1' --"

with engine.connect() as conn:
    # ✅ 走 ORM 的参数化 API：绑定参数，载荷只是普通字符串
    stmt = text("SELECT * FROM users WHERE name = :name")
    print(len(conn.execute(stmt, {"name": attack}).fetchall()))   # 0 —— 安全

    # ❌ f-string 混进 text()：保护立刻清零，与裸拼无异
    bad = text(f"SELECT * FROM users WHERE name = '{attack}'")
    print(len(conn.execute(bad).fetchall()))                      # 2 —— 注入成功
```

判读：两条 print 一个 0 一个 2——ORM 不是护身符，**它只在「你走参数化 API」时保护你**。code review 时见到 `text(f"...")`、`execute(f"...")` 一律按漏洞处理。

### 第 4 步：白名单排序接口——占位符管不了的标识符（sort_api.py）

```python
# sort_api.py —— 动态 ORDER BY 的唯一正解：白名单映射
from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine, text

app = FastAPI()
engine = create_engine("sqlite:///:memory:")
with engine.begin() as conn:
    conn.execute(text(
        "CREATE TABLE articles (title TEXT, view_count INT, created_at TEXT)"))
    conn.execute(text("INSERT INTO articles VALUES ('a', 30, '2026-01-01')"))

# 白名单：用户输入 → 真实列名；名单之外的键一律拒绝
ORDER_COLUMNS = {"views": "view_count", "date": "created_at", "title": "title"}
ORDER_DIRS = {"asc": "ASC", "desc": "DESC"}       # 排序方向同样白名单

@app.get("/articles")
def list_articles(sort: str = Query("date"), direction: str = Query("desc")):
    col = ORDER_COLUMNS.get(sort)
    dr = ORDER_DIRS.get(direction.lower())
    if col is None or dr is None:
        raise HTTPException(400, "非法排序参数")    # 不在名单内 → 400，绝不拼进 SQL
    # 列名出自固定字典（可信），过滤条件仍走参数绑定
    sql = text(f"SELECT title, view_count, created_at "
               f"FROM articles ORDER BY {col} {dr} LIMIT :limit")
    with engine.connect() as conn:
        rows = conn.execute(sql, {"limit": 20}).fetchall()
    return [{"title": r[0], "views": r[1], "date": r[2]} for r in rows]
```

启动 `uvicorn sort_api:app --port 8000` 后验证三种输入：

```text
/articles?sort=views&direction=asc      → 正常返回，按 view_count 升序
/articles?sort=view_count DESC; --      → 400 非法排序参数（载荷被名单拒绝）
/articles?sort=(SELECT 1)               → 400（同上）
```

判读：用户输入只允许当「字典的键」，标识符永远出自程序员的字典——`ORDER BY` 注入的经典入口被结构性封死。

### 第 5 步：报错脱敏对照

```python
# ❌ 危险：把数据库异常原样返给前端
# raise HTTPException(500, detail=str(e))
#   → 表名、列名、SQL 片段全部外泄，攻击者靠报错回显摸清库结构

# ✅ 修复：异常记日志，对外给通用提示
import logging
logger = logging.getLogger("app")

def safe_query(sql, params):
    try:
        with engine.connect() as conn:
            return conn.execute(text(sql), params).fetchall()
    except Exception:
        logger.exception("SQL 执行失败")                       # 详情只进服务端日志
        raise HTTPException(500, "服务暂时不可用，请稍后再试")  # 对外一句话
```

### 三写法对照总结

| 写法 | 关键代码 | `' OR '1'='1' --` 的结局 |
| ---- | ---- | ---- |
| ❌ f-string 拼接 | `f"...name='{name}'"` | 改写 WHERE，绕过登录 |
| ✅ 参数化 | `execute(sql, (name, pwd))` | 普通字符串值，查无此人 |
| ✅ ORM 参数化 API | `text(...)` + 绑定参数 | 同上，安全 |
| ❌ ORM 混拼 | `text(f"...{name}")` | 保护清零，注入成功 |

## 常见坑

1. **坑 1：以为「过滤关键词」是解法**。现象：加了 `replace("SELECT","")` 仍被注入。原因：编码变体（注释、hex、大小写、双层编码）无穷，且会误伤含撇号的正常输入。排查：删掉黑名单过滤，全部改参数化；过滤只能当辅助记录手段。
2. **坑 2：ORM 里混进拼接**。现象：用了 ORM 还是被报注入。原因：`text(f"...")`、`session.execute(f"...")` 绕过了参数化通道——ORM 只在走它的 API 时保护你。排查：code review 专查 ORM 调用里的 f-string / `%` / `+` 拼接。
3. **坑 3：动态表名/排序走占位符或拼接**。现象：`ORDER BY ?` 报语法错，或 `ORDER BY {col}` 被注入。原因：标识符（表名/列名/方向）不是值，参数绑定在语义上不适用。排查：一律白名单映射字典，名单外直接 400。
4. **坑 4：报错信息原样返回**。现象：前端报错弹窗里出现表名、列名、SQL 片段。原因：异常直接 `str(e)` 透传，给攻击者发地图。排查：异常记服务端日志，对外统一「服务暂时不可用」。
5. **坑 5：数据库账号用了管理员权限**。现象：注入成功后整库被拖/被毁。原因：应用连接用了 root/sa。排查：应用账号按最小权限配置——只读写业务库、禁 DROP/GRANT，把「万一被注入」的损失上限压低。

## 小练习

1. 复现实验 A/B：对两种写法分别试 `' OR '1'='1' --`、`alice' --`、`o'keefe` 三种输入，先预测再验证各返回值，并解释第三个「正常输入」为什么也该被安全处理。
2. 给第 4 步的白名单接口再加一个「每页条数」参数（limit），要求：占位符绑定 + 上下限钳制（1-50），防止超大 limit 拖库。
3. 故意把实验 C 的安全写法改成 f-string 混拼，观察两条 print 的差异，写三行说明「ORM 的保护边界」到底在哪里。
4. **综合修复任务**：把 vuln.py 改造成完整安全版——(a) 登录走参数化；(b) 增加按 `title`/`created_at` 白名单排序的用户列表接口；(c) 异常脱敏；(d) 写一份「三种载荷 × 修复前后」的结果对照表（6 行以内）。
