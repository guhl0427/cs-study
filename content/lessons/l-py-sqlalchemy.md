---
id: l-py-sqlalchemy
slug: py-sqlalchemy
title: SQLAlchemy：Python 的 ORM
difficulty: 2
estMinutes: 85
tags: [SQLAlchemy, ORM, 数据库]
summary: ORM 是对象和表的翻译官——模型类对应表、实例对应行，SQL 知识全都不浪费，只是换了个对象化的写法。本课用 2.0 风格走通 Article 的完整 CRUD，讲透 Session 生命周期与 N+1。
updated: 2026-11-22
resources:
  - id: r-sqlalchemy-doc
    title: SQLAlchemy 官方教程
    url: https://docs.sqlalchemy.org/en/20/tutorial/
    type: doc
    difficulty: 2
    note: 2.0 风格的统一教程，ORM 部分从「Working with ORM」开始。
  - id: r-sqlalchemy-orm
    title: SQLAlchemy · ORM Quick Start
    url: https://docs.sqlalchemy.org/en/20/orm/quickstart.html
    type: doc
    difficulty: 2
    note: DeclarativeBase/Mapped/mapped_column 的官方快速上手。
  - id: r-fastapi-sql
    title: FastAPI · SQL Databases（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/sql-databases/
    type: doc
    difficulty: 2
    note: 官方的 SQLAlchemy + FastAPI 整合教程，下一课实战的基础。
---

> 一句话定义：ORM 让你**用 Python 对象读写数据库**——类=表、对象=行，SQL 知识全都不浪费，只是换了个对象化的写法，同时把参数化查询（防注入）、连接复用这些底层正确性打包送给你。

## 概念讲解

### ORM 翻译官心智：两张世界的对照表

「SQL 入门」学过表、行、主键、外键。ORM（Object-Relational Mapper）就是站在 Python 对象世界和关系表世界中间的**翻译官**——你说对象语言，它翻译成 SQL；结果集回来，它再翻译成对象：

```text
数据库世界                →    Python 世界
表 articles               →    class Article(Base)
列 id / title / views     →    类属性 id / title / views
一行记录                  →    一个 Article 实例（article.title 就是该行的 title 列）
INSERT INTO articles ...  →    session.add(article); session.commit()
SELECT ... WHERE ...      →    session.scalars(select(Article).where(...))
UPDATE ... SET ...        →    article.views = 5; session.commit()
DELETE FROM ...           →    session.delete(article); session.commit()
```

关键认知：**ORM 不消灭 SQL，而是把 SQL 包装成对象操作**。你写的每个 ORM 调用背后都是一条 SQL——好用的 ORM 用法建立在懂 SQL 的基础上；不懂 SQL 的人用 ORM 只会「碰运气式编程」。本课代码示例都会附 SQL 对照注释，让翻译过程全程可见。

### 三个核心角色：Engine、Session、Model

| 角色 | 心智模型 | 管什么 | 创建频率 |
| ---- | ---- | ---- | ---- |
| Engine | 「电话总机」连接池 | 维护到数据库的连接，谁要用就分配，用完回收 | 整个应用**一个**（模块级创建） |
| Session | 「一次通话」+ 草稿箱 | 承载一次对话：跟踪改动的对象、管理事务边界 | 每个请求/任务**一个**，用完即关 |
| Model | 表的映射类 | 声明表结构（类=表、属性=列），提供对象化操作入口 | 每张表**一个**（启动时定义） |

最容易搞错的是 Engine 和 Session 的边界：**Engine 是基础设施（贵，全局复用），Session 是工作单元（轻，用完就扔）**。把 Session 当全局单例是新手第一大坑——多个请求共用一个 Session 会串状态、事务互相纠缠。

### 2.0 风格模型定义：DeclarativeBase + Mapped + mapped_column

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String

class Base(DeclarativeBase):        # 所有模型的公共基类
    ...

class Article(Base):
    __tablename__ = "articles"                      # 表名
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    views: Mapped[int] = mapped_column(default=0)
```

三件套各管一摊：`DeclarativeBase` 提供「类→表」的映射机制（metadata 收集所有模型）；`Mapped[int]` 是**类型注解**——Python 类型直接映射列类型（int→INTEGER、str→VARCHAR、bool→BOOLEAN、datetime→DATETIME），`Mapped[str | None]` 表示可空列；`mapped_column` 做列的精细配置（主键、长度、默认值、索引、可空）。**注解即 DDL**——和 FastAPI 的「注解即校验」一个思想：声明一次，多处生效。

### Session 生命周期：草稿箱模型（add → commit → refresh）

把 Session 想成**草稿箱**：

```text
session.add(a)      →  把对象放进草稿箱（还没写进数据库！）
session.commit()    →  把草稿誊写进数据库（一次事务落库）
session.refresh(a)  →  把数据库生成的值（自增 id 等）同步回对象
session.rollback()  →  作废草稿箱里的改动
session.close()     →  通话结束，归还连接
```

三条铁律：**add 不是写入**（不 commit，进程一退数据蒸发）；**commit 后对象上未必有数据库生成的值**（自增 id、默认值时间戳，要 refresh 拉回来）；**改已有行不用 add**（查询出的对象改属性再 commit，SQLAlchemy 自动侦测变更——unit of work 模式）。用 `with Session(engine) as session:` 管理生命周期：with 块结束自动 close，和 `with open(...)` 一个习惯。

### 查询：select 家族

2.0 风格的查询统一从 `select()` 语句出发：

```python
stmt = select(Article).where(Article.views >= 10)     # WHERE
stmt = stmt.order_by(Article.views.desc())            # ORDER BY views DESC
stmt = stmt.limit(3)                                  # LIMIT 3
rows = session.scalars(stmt).all()                    # 执行 → Article 对象列表
one = session.get(Article, 1)                         # 按主键查一条（最常用）
```

对照 SQL：`SELECT * FROM articles WHERE views >= 10 ORDER BY views DESC LIMIT 3`。`session.scalars()` 表示「我要的是对象行（每行一个 Article）」；`session.get(Model, pk)` 是按主键取一条的快捷方式，查不到返回 None——这个 None 会在下一课变成 404。

### create_all 与迁移的边界

```python
Base.metadata.create_all(engine)     # 幂等：表不存在就建，已存在就跳过
```

`create_all` **只会建新表，不会改旧表**——给 Article 加了 `created_at` 列，已有数据表不会长出这一列，查询直接报 `no such column`。这是 create_all 和迁移工具的分界：**原型期（可以随时删库重建）用 create_all；数据不能丢的库用 Alembic 迁移**（生成 ALTER TABLE 脚本、可回滚）。本课先用 create_all + SQLite 删库重建，项目上生产前再学 Alembic。

### N+1 问题与预加载

模型之间有关联时（文章 → 评论），默认是「懒加载」——用到才查：

```python
articles = session.scalars(select(Article)).all()   # 1 条 SQL
for a in articles:
    print(a.comments)        # 每访问一次，触发 1 条新的评论查询！
```

10 篇文章就是 **1 + 10 = 11 条 SQL**——列表页越往后越慢，日志里同一条查询刷屏，这就是 N+1。对策是**预加载**：查列表时把关联一次带回来：

```python
from sqlalchemy.orm import selectinload
stmt = select(Article).options(selectinload(Article.comments))
# 全程只有 2 条 SQL：一条查文章，一条 WHERE article_id IN (...) 查全部评论
```

排查口诀：**列表页慢 + 日志 SQL 成串 → 先想 N+1**。

### 与手写 SQL 的分工

ORM 不是唯一出口，分工看任务复杂度：**单表 CRUD、按主键取、关联对象的加载**交给 ORM（最舒服的场景）；**多表 JOIN + 聚合的报表、批量导入**直接写 SQL——`session.execute(text("SELECT ..."))` 随时可用，参数化防注入同样生效。正解是「日常增删改查用 ORM，复杂统计直接 SQL」，SQLAlchemy 并不拦着你写 SQL。顺带一提：ORM 的参数化查询天然免疫 SQL 注入（下一章正面拆解的漏洞），手拼 f-string SQL 才是重灾区。

## 代码示例

主线任务：Article 模型完整 CRUD——从建表到增查改删，每步附 SQL 对照注释与运行输出。全程约 35 分钟。

### 第 0 步：安装与建模

```bash
pip install "sqlalchemy>=2.0"        # 2.0 风格
```

```python
# blog.py
from datetime import datetime

from sqlalchemy import ForeignKey, String, create_engine, select
from sqlalchemy.orm import (DeclarativeBase, Mapped, Session,
                            mapped_column, relationship, selectinload)

engine = create_engine("sqlite:///blog.db", echo=True)   # echo=True：打印每条 SQL
# 换 MySQL 只改连接串：mysql+pymysql://user:pwd@host:3306/blog

class Base(DeclarativeBase): ...

class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    views: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    comments: Mapped[list["Comment"]] = relationship(back_populates="article")

class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(200))
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id"), index=True)
    article: Mapped["Article"] = relationship(back_populates="comments")

Base.metadata.create_all(engine)      # 幂等建表；改了模型就删 blog.db 重建
```

`echo=True` 是学习神器：每条 ORM 调用背后真实的 SQL 都会打印出来——翻译官的工作过程全程可见。

### 第 1 步：增（INSERT）

```python
with Session(engine) as session:
    a = Article(title="Hello ORM", views=0)      # 新对象 = 新行（还在草稿箱外）
    session.add(a)                               # 放进草稿箱
    session.commit()                             # 誊写进数据库
    session.refresh(a)                           # 把自增 id 同步回对象
    print(a.id, a.created_at)
```

```text
-- echo 打印的 SQL（节选）
BEGIN (implicit)
INSERT INTO articles (title, views, created_at) VALUES (?, ?, ?)
   ... ('Hello ORM', 0, '2026-11-22 10:00:00')
COMMIT
SELECT articles.id, articles.title, ... WHERE articles.id = ?   -- refresh 的补查
```

运行输出：`1 2026-11-22 10:00:00`——commit 之后 id 从 None 变成了 1，这是 refresh 的功劳。

### 第 2 步：查（SELECT）

```python
with Session(engine) as session:
    # ① 按主键查一条
    a = session.get(Article, 1)          # SELECT ... WHERE articles.id = 1
    print(a.title)                       # Hello ORM

    # ② 条件 + 排序 + 截断
    stmt = (select(Article)
            .where(Article.title.like("Hello%"))
            .order_by(Article.views.desc())
            .limit(3))
    for row in session.scalars(stmt).all():
        print(row.id, row.title, row.views)
```

对照 SQL：`SELECT * FROM articles WHERE title LIKE 'Hello%' ORDER BY views DESC LIMIT 3`——ORM 写法只是把子句换成了链式方法，子句与方法的对应关系一目了然。

### 第 3 步：改（UPDATE）——不用 add，改属性即可

```python
with Session(engine) as session:
    a = session.get(Article, 1)
    a.views += 1                         # 对象已被 session 追踪
    session.commit()                     # UPDATE articles SET views=? WHERE id=?
    print(a.views)                       # 1
```

查询出的对象被 Session 自动追踪：属性一改、commit 一提，UPDATE 自动生成——这就是 unit of work：你改对象，它记账，commit 时统一落库。

### 第 4 步：删（DELETE）

```python
with Session(engine) as session:
    a = session.get(Article, 1)
    session.delete(a)
    session.commit()                     # DELETE FROM articles WHERE articles.id = ?
```

### 第 5 步：关联与 N+1——预加载前后对比

```python
# 造数据：1 篇文章 + 2 条评论
with Session(engine) as session:
    a = Article(title="带评论的文章")
    a.comments = [Comment(content="好文"), Comment(content="收藏了")]
    session.add(a)
    session.commit()

# 反面教材：N+1
with Session(engine) as session:
    for art in session.scalars(select(Article)).all():     # 1 条 SQL
        print(art.title, len(art.comments))                # 每行触发 1 条评论查询
# echo 日志里 SELECT comments ... 刷了 N 次

# 正确姿势：selectinload 预加载
with Session(engine) as session:
    stmt = select(Article).options(selectinload(Article.comments))
    for art in session.scalars(stmt).all():
        print(art.title, len(art.comments))    # 全程只有 2 条 SQL
```

把 `echo=True` 的日志拉出来数 SQL 条数，N+1 和预加载的差异一目了然——**这一眼胜过十遍概念**。

## 常见坑

1. **坑 1：忘 commit**。现象：程序跑完不报错，库里却没数据；下次运行 id 又从 1 开始。原因：add 只进草稿箱，commit 才落库。排查：每次 add/delete/改属性后核对是否 commit；SQLite 用户直接 `sqlite3 blog.db "SELECT * FROM articles"` 验证。
2. **坑 2：commit 后直接用对象上的 id 却是 None**。现象：返回给前端的新对象没有 id。原因：自增主键由数据库生成，commit 不会自动同步回对象。排查：commit 后 `session.refresh(obj)`；FastAPI 里返回前刷新（下一课）。
3. **坑 3：Session 用成全局单例**。现象：并发请求偶发脏数据、报 "This Session is already flushing"、锁等待。原因：多个请求共用一次「对话」，事务互相纠缠。排查：每请求一个 Session（FastAPI 用 Depends 注入生成器）；Engine 才是全局唯一。
4. **坑 4：改了模型表不变**。现象：新字段一查就报 no such column。原因：create_all 只建新表不改旧表。排查：开发期删库重建（SQLite 删 .db 文件）；数据不能丢时上 Alembic 迁移。
5. **坑 5：N+1 查询拖垮列表页**。现象：列表接口越慢越离谱，日志里同一条关联查询刷屏。原因：懒加载逐条触发关联查询。排查：`selectinload`/`joinedload` 预加载；用 echo 日志或 APM 数 SQL 条数定位。
6. **坑 6：把 ORM 当「不用学 SQL」的捷径**。现象：查询慢、行为诡异却无从下手，生成的 SQL 看不懂。原因：ORM 是 SQL 的翻译官不是替代品。排查：开 echo=True 看翻译结果；复杂查询直接写 SQL（text()），别硬用 ORM 拼。

## 小练习

1. 给 Article 加 `status: Mapped[str] = mapped_column(String(20), default="draft")`，删库重建验证新列；再把连接串换成 MySQL 体会换库成本（只改 create_engine 一行）。
2. 写「浏览量最高的前 3 篇」查询：`select(Article).order_by(Article.views.desc()).limit(3)`，并从 echo 日志里抄出它对应的 SQL。
3. 亲手量一次 N+1：先跑懒加载版本，数 echo 日志里评论查询的条数；再改 selectinload 对比——把两个数字记下来。
4. **综合任务**：写一个 `seed.py`：批量创建 20 篇文章（views 随机）、每篇 1-3 条评论；然后输出「浏览量 Top3 及其评论数」报表——能顺用 ORM 的部分用 ORM，聚合统计部分直接 `text()` 写 SQL，并在注释里说明你的分工理由。
