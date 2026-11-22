---
id: l-py-sqlalchemy
slug: py-sqlalchemy
title: SQLAlchemy：Python 的 ORM
difficulty: 2
estMinutes: 40
tags: [SQLAlchemy, ORM, 数据库]
summary: ORM 是对象和表的翻译官——模型类对应表、实例对应行，SQL 知识全都不浪费，只是换了个对象化的写法。
updated: 2026-11-22
resources:
  - id: r-sqlalchemy-doc
    title: SQLAlchemy 官方教程
    url: https://docs.sqlalchemy.org/en/20/tutorial/
    type: doc
    difficulty: 2
    note: 2.0 风格的统一教程，ORM 部分从「Working with ORM」开始。
  - id: r-fastapi-sql
    title: FastAPI · SQL Databases（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/sql-databases/
    type: doc
    difficulty: 2
    note: 官方的 SQLAlchemy + FastAPI 整合教程，下一课实战的基础。
---

> 一句话定义：ORM 让你**用 Python 对象读写数据库**——类=表、对象=行，省去拼 SQL 字符串，同时事务、防注入这些底层正确性打包送给你。

## 概念讲解

「SQL 入门」学过表与关系，ORM 只是把这套知识翻译成对象语言：

```text
数据库世界            →    Python 世界
表 articles           →    class Article(Base)
列 id/title/views     →    属性 id/title/views
一行记录              →    一个 Article 实例
INSERT INTO ...       →    session.add(article)
SELECT ... WHERE      →    session.query(...).filter_by(...)
```

两件容易被误解的事：

1. **ORM 不消灭 SQL**。简单 CRUD 它写得好；复杂查询（多表 JOIN + 聚合）用 ORM 拼反而费劲——正解是「日常增删改查用 ORM，复杂报表直接上 SQL」。你对 SQL 越熟，ORM 用得越好。
2. **防注入是白送的**。手拼 SQL 字符串（`f"... WHERE name = '{name}'"`）是 SQL 注入的重灾区；ORM 的参数化查询天然免疫——这是下一课「SQL 注入」要正面拆解的漏洞。

三个核心角色：**Engine**（连接池，应用创建一个就够）、**Session**（一次对话，管理事务边界——用完即关）、**Model**（映射表的类）。

## 代码示例

从连接到 CRUD 走一遍（SQLite 零配置，换 MySQL 只改连接串）：

```python
from sqlalchemy import create_engine, String, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

engine = create_engine("sqlite:///blog.db")     # 换 MySQL: mysql+pymysql://user:pwd@host/blog

class Base(DeclarativeBase): ...

class Article(Base):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    views: Mapped[int] = mapped_column(default=0)

Base.metadata.create_all(engine)                 # 建表（幂等，已存在就跳过）

with Session(engine) as session:                 # 增
    a = Article(title="Hello ORM")
    session.add(a)
    session.commit()                             # commit 后 a.id 自动回填

with Session(engine) as session:                 # 查
    stmt = select(Article).where(Article.title.like("Hello%"))
    first = session.scalars(stmt).first()
    print(first.id, first.title)                 # 1 Hello ORM
    first.views += 1
    session.commit()                             # 改：改属性再 commit
```

## 常见坑

1. **坑 1：忘 commit**。add 之后不 commit，进程一退数据就没了——Session 是「草稿箱」，commit 才真正落库。
2. **坑 2：Session 用成全局的**。多个请求共用一个 Session 会串状态、锁纠缠。FastAPI 的标准姿势是依赖注入（`Depends(get_session)`），每个请求一个 Session、用完自动关。
3. **坑 3：N+1 查询**。循环里逐条查询：1 次查列表 + N 次查关联 = N+1 次 SQL。症状：列表页越慢越离谱。对策：`selectinload` 预加载关联。
4. **坑 4：改了模型忘迁移**。`create_all` 只建新表不改旧表——加字段后要跑 Alembic 迁移，否则报「no such column」。

## 小练习

1. 给 Article 加 `created_at: Mapped[datetime]` 字段（`default=lambda: datetime.now()`），删除 blog.db 重建，验证新列。
2. 写一个「按浏览量倒序取前 3 篇」的查询（`order_by(Article.views.desc()).limit(3)`）。
3. 思考题：把「SQL 入门」的联合索引知识迁移过来——ORM 模型上给哪列加索引（`index=True`）？什么时候建？
