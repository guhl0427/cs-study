---
id: l-sec-sql-injection
slug: sec-sql-injection
title: SQL 注入：字符串拼接的经典事故
difficulty: 3
estMinutes: 40
tags: [安全, 数据库]
summary: SQL 注入 = 用户数据混进了 SQL 语法——参数化查询让数据永远是数据，这一个习惯就能挡掉榜单第一的漏洞。
updated: 2026-11-22
resources:
  - id: r-owasp-sqli
    title: OWASP · SQL Injection
    url: https://owasp.org/www-community/attacks/SQL_Injection
    type: doc
    difficulty: 3
    note: OWASP 榜单常年的第一名，原理与防御清单。
  - id: r-sqlalchemy-params
    title: SQLAlchemy · Using Textual SQL
    url: https://docs.sqlalchemy.org/en/20/tutorial/dbapi_transactions.html#tutorial-executing-text
    type: doc
    difficulty: 2
    note: 即使写原生 SQL，ORM 里也能用参数绑定。
---

> 一句话定义：SQL 注入 = 攻击者的输入被**拼进 SQL 当语法执行**——`' OR '1'='1` 就能绕过登录、`'; DROP TABLE` 能毁库；解法只有一个词：参数化。

## 概念讲解

登录校验的 SQL，危险写法是把用户输入直接拼进字符串：

```python
# ❌ 危险：字符串拼接
sql = f"SELECT * FROM users WHERE name='{name}' AND pwd='{pwd}'"
```

正常输入 `name=alice` 没问题。攻击者把单引号当「逃逸符」：输入 `' OR '1'='1`，拼出来的 SQL 变成：

```sql
SELECT * FROM users WHERE name='' OR '1'='1' AND pwd=''
-- WHERE 恒为真 → 全表数据返回 → 登录绕过
```

数据（用户输入）混成了**代码（SQL 语法）**——和 XSS 同构：XSS 是数据混成 HTML 代码，SQL 注入是数据混成 SQL 代码。**解法也同构：让边界永远清晰。**

参数化查询（Prepared Statement）把「SQL 骨架」和「数据」分开传输：

```python
# ✅ 安全：参数占位，数据永远是数据
sql = "SELECT * FROM users WHERE name=%s AND pwd=%s"
cursor.execute(sql, (name, pwd))
```

数据库先编译好带占位符的语句骨架，再把参数原样填进去——`' OR '1'='1` 全程只是一段普通字符串，永远不会被解析成 SQL。这不是「过滤特殊字符」的打补丁，而是结构上杜绝混淆。**ORM（SQLAlchemy/GORM/MyBatis）的日常 API 全是参数化的**——这正是「ORM 一课」说防注入白送的底层原因。

## 代码示例

三种写法的实际行为对照（Python + sqlite3）：

```python
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, pwd TEXT)")
conn.execute("INSERT INTO users VALUES ('alice', 'pw123')")

attack = "' OR '1'='1"                      # 经典注入载荷

# ❌ 拼接：注入成功，无需密码返回全部行
n1 = len(conn.execute(f"SELECT * FROM users WHERE name='{attack}' AND pwd='x'").fetchall())
print(n1)                                    # 1——绕过了密码校验！

# ✅ 参数化：载荷只是普通字符串，查不到这个人
n2 = len(conn.execute(
    "SELECT * FROM users WHERE name=? AND pwd=?", (attack, "x")
).fetchall())
print(n2)                                    # 0——注入无效
```

即便必须写原生 SQL，也走参数绑定（SQLAlchemy text()）：

```python
from sqlalchemy import text
stmt = text("SELECT * FROM users WHERE name = :name")   # 冒号占位
rows = conn.execute(stmt, {"name": attack}).fetchall()  # 永远参数化
```

## 常见坑

1. **坑 1：以为「过滤关键词」是解法**。黑名单过滤（拦 SELECT、拦引号）存在无穷编码绕过，且会误伤正常输入（密码里带引号的人怎么办）。唯一正解是参数化。
2. **坑 2：ORM 里混进拼接**。`session.execute(f"...{name}")` 把 ORM 的保护全绕过了——ORM 只在「你走它参数化 API」时才保护你。
3. **坑 3：动态表名/排序字段走参数**。`ORDER BY ?` 占位无效（表名、列名是标识符不是值）——这类必须用**白名单映射**：只允许从固定集合里选。
4. **坑 4：报错信息泄露结构**。把 SQL 异常原样返回给前端（表名、列名全暴露），等于给攻击者发地图——异常自己记日志，对外给通用错误页。

## 小练习

1. 复现示例的三种情况，观察拼接版与参数化版对 `' OR '1'='1` 的不同行为。
2. 写一个按列排序的接口，用白名单（`{"views": "views", "date": "created_at"}`）映射用户传入的排序字段。
3. 思考题：对比 XSS、SQL 注入、命令注入——它们共同的根因是什么？参数化/转义/白名单各自适用于哪种上下文？
