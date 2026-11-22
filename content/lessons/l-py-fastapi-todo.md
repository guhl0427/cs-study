---
id: l-py-fastapi-todo
slug: py-fastapi-todo
title: 实战：一个完整的待办事项 API
difficulty: 2
estMinutes: 90
tags: [FastAPI, 项目实战]
summary: 把 FastAPI、Pydantic、SQLAlchemy 三件工具拼成一个真实服务——三文件分层、依赖注入管理 Session、完整 CRUD 状态码各就各位，这个骨架能长成你的任何后端项目。
updated: 2026-11-22
resources:
  - id: r-fastapi-sql
    title: FastAPI · SQL Databases（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/sql-databases/
    type: doc
    difficulty: 2
    note: 本课代码结构的官方出处，扩展字段时对照着看。
  - id: r-fastapi-dependencies
    title: FastAPI · Dependencies（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/dependencies/
    type: doc
    difficulty: 2
    note: yield 依赖的官方讲解，get_session 机制的出处。
  - id: r-httpie
    title: HTTPie（命令行接口调试）
    url: https://httpie.io/
    type: tool
    difficulty: 1
    note: 比 curl 更友好的调试工具，验证本课 API 用。
---

> 一句话定义：把前三课的零件（路由、校验模型、ORM）组装成**分层的完整服务**——这个约 120 行的待办 API，就是你第一个可以直接长成真实项目的后端骨架。

## 概念讲解

### 工程结构：三文件各管一摊

单文件 main.py 写到一百行就该拆了。本课的目录结构是 FastAPI 官方教程同款，也是无数生产项目的起点：

```text
todo-api/
├── main.py        # 装配层：应用实例、路由、依赖注入（每个端点做什么）
├── models.py      # 表模型层：SQLAlchemy 模型（数据库长什么样）
└── schemas.py     # 契约层：Pydantic 模型（接口进出什么数据）
```

依赖方向是单向的：main 引用 schemas 和 models；models 与 schemas **互不 import**——表结构和接口契约彼此独立，这是整个分层的关键纪律（呼应「代码规范」一课的单一职责）。

### models 与 schemas 为什么要分开：完整论证

初学最常见的质疑：「Todo 表有 id/title/done，接口也传 title、返回 id/title/done——结构几乎一样，何必两个文件？」四个理由，从浅到深：

1. **生命周期不同**。表结构服务于数据完整性，改动要迁移、要谨慎（上一课的 Alembic）；接口契约是对前端的承诺，随产品需求频繁演化（今天加分页、明天加排序）。节奏不同的事物绑在一起，迟早出现「为了接口加个字段去动数据库列」或反过来的事故。
2. **方向不对称**（Pydantic 课的入站出站分离，在这里落地）。入站（POST /todos）只该收 title；出站要回 id/title/done；更新（PATCH）又只收改的字段——同一张表的数据对应**至少三个契约**，一个 SQLAlchemy 类根本表达不了。
3. **技术类型不同**。SQLAlchemy 模型的字段是列描述（Mapped，服务于建表与查询）；Pydantic 模型的字段是校验器（Field，服务于进出数据）。混写要么丢掉 ORM 能力，要么手工在校验和 ORM 之间倒腾字典——两边的自动化全部报废。
4. **隔离改动成本**。契约层稳定后，前端照 schemas 先 mock；将来换数据库（SQLite→PostgreSQL）只动 models，接口版本化只动 schemas——改动被隔离在各自的文件里。

一句话：**models 描述「数据怎么存」，schemas 描述「数据怎么进出」——存与进出是两个世界的问题，各用各的语言**。

### 依赖注入：get_session 与 yield 的资源生命周期

FastAPI 的 `Depends` 不只是传参数，配合生成器函数还是**资源生命周期管理器**：

```python
def get_session():
    with Session(engine) as session:
        yield session          # ① yield 之前：请求进来时执行（创建资源）
        # ② yield 之后：响应发送完毕后执行（清理资源）
```

一个请求的完整时序：

```text
请求到达 → FastAPI 调 get_session() → 创建 Session → 在 yield 处暂停
        → 把 session 交给路由函数执行业务
        → 响应发送完毕 → 恢复 get_session()，执行 yield 之后的代码
        → with 退出 → session.close() → 连接归还连接池
```

这就是「每个请求一个 Session」的标准实现：**创建与清理写在同一处，FastAPI 保证一进一出**——不用在每个路由函数里写 try/finally，也不会忘记关闭。对照上一课的 Engine/Session 边界：Engine 全局一个，Session 每请求一个，靠的就是这个 yield 依赖。

### 五个端点，五种状态码语义

| 方法 | 路径 | 成功码 | 语义 | 失败码 |
| ---- | ---- | ---- | ---- | ---- |
| POST | /todos | 201 Created | 新资源已创建，响应体回显它 | 422（校验不过） |
| GET | /todos | 200 OK | 返回集合（列表） | —— |
| GET | /todos/{id} | 200 OK | 返回单个资源 | 404（不存在） |
| PATCH | /todos/{id}/toggle | 200 OK | 部分更新/状态翻转，回更新后的资源 | 404 |
| DELETE | /todos/{id} | 204 No Content | 删除成功，无内容可回 | 404 |

对照 REST 课的约定逐条回看：**201 只给创建**（区别于一般成功的 200）；**204 只给无正文的成功**（删除后没什么可回的，响应体必须为空）；PATCH 用 200 回更新后的完整资源（前端不用再查一次）。写 CRUD 时先对着表入座，状态码就不会乱。

### 404 为什么必须用 HTTPException

上一课讲过把错误塞进 200 是反模式，这里补完「为什么」：

1. **语义**：REST 里状态码是结果的第一个字段——404 直接告诉调用方「资源不存在」，比 body 里的 error 字段更先被读到；
2. **可编程**：前端、网关、监控都按状态码分流——404 触发「展示空状态」，429 触发「退避重试」，全 200 的错误体谁都监控不了；
3. **框架级行为**：`raise HTTPException(404, detail=...)` 由 FastAPI 统一渲染成 `{"detail": "..."}`——和 422 校验错误同构，前端一套代码处理两类错误。

查资源用 `session.get(Todo, todo_id)`，查不到返回 None，这是最自然的检查点：**None → raise HTTPException(404)**——这五行是所有 REST 服务的通用模式，值得练成肌肉记忆。

### session.refresh 的时机

上一课埋的钩子在这里收尾：`commit` 之后，自增 id 已在数据库里生成，但**对象上未必拿到**（不同数据库驱动行为不同，SQLite 上常见 id 还是 None）。要让返回给前端的 JSON 带上 id，commit 后必须 `session.refresh(todo)`——它补发一条 SELECT，把数据库里的最新行同步回对象。口诀：**新建对象：add → commit → refresh → 再返回；修改对象：改属性 → commit 即可**（改的属性本来就在对象上，不需要 refresh）。

## 代码示例

主线任务：跑通完整 todo-api——五个端点全部实现，用 HTTPie 逐一验证。全程约 40 分钟。

### 第 0 步：安装与目录

```bash
pip install "fastapi[standard]" "sqlalchemy>=2.0"
pip install httpie                   # 验证工具（比 curl 少敲很多引号）
mkdir todo-api                       # 三个文件都放这个目录
```

### 第 1 步：models.py——表模型

```python
# models.py
from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase): ...

class Todo(Base):
    __tablename__ = "todos"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    done: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
```

### 第 2 步：schemas.py——接口契约

```python
# schemas.py
from datetime import datetime

from pydantic import BaseModel, Field

class TodoIn(BaseModel):             # 入站：创建时用户能传的
    title: str = Field(min_length=1, max_length=50)

class TodoPatch(BaseModel):          # 入站：更新时全可选
    title: str | None = Field(default=None, min_length=1, max_length=50)
    done: bool | None = None

class TodoOut(BaseModel):            # 出站：接口返回的
    id: int
    title: str
    done: bool
    created_at: datetime
```

三个契约对应三个方向：创建、更新、返回——这就是「为什么分开」的具象化。

### 第 3 步：main.py——装配与五个端点

```python
# main.py
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models import Base, Todo
from schemas import TodoIn, TodoOut, TodoPatch

engine = create_engine("sqlite:///todo.db")
Base.metadata.create_all(engine)                 # 原型期：建表（改模型就删库重建）

app = FastAPI(title="Todo API")

def get_session():                               # 依赖：每请求一个 Session
    with Session(engine) as session:
        yield session

def get_todo_or_404(todo_id: int, session: Session) -> Todo:
    todo = session.get(Todo, todo_id)            # 按主键查
    if todo is None:
        raise HTTPException(status_code=404, detail="待办不存在")
    return todo

@app.post("/todos", response_model=TodoOut, status_code=201)
def create_todo(data: TodoIn, session: Session = Depends(get_session)):
    todo = Todo(**data.model_dump())             # 契约对象 → 表对象
    session.add(todo)
    session.commit()
    session.refresh(todo)                        # 把自增 id 同步回对象
    return todo                                  # response_model 输出 TodoOut

@app.get("/todos", response_model=list[TodoOut])
def list_todos(session: Session = Depends(get_session)):
    return session.scalars(select(Todo).order_by(Todo.id)).all()

@app.get("/todos/{todo_id}", response_model=TodoOut)
def read_todo(todo_id: int, session: Session = Depends(get_session)):
    return get_todo_or_404(todo_id, session)

@app.patch("/todos/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, data: TodoPatch, session: Session = Depends(get_session)):
    todo = get_todo_or_404(todo_id, session)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(todo, field, value)              # 只更新传了的字段
    session.commit()
    return todo

@app.patch("/todos/{todo_id}/toggle", response_model=TodoOut)
def toggle_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = get_todo_or_404(todo_id, session)
    todo.done = not todo.done                    # 原地取反
    session.commit()                             # 改属性 + commit 即 UPDATE
    return todo

@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = get_todo_or_404(todo_id, session)
    session.delete(todo)
    session.commit()                             # 204：无响应体
```

注意三个细节：`get_todo_or_404` 把「查不到 → 404」收敛成一处（DRY）；每个端点都声明了 `response_model`（出站闸门）；`create_todo` 里 commit 后 refresh 才 return。

### 第 4 步：启动

```bash
cd todo-api
fastapi dev main.py
# INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 第 5 步：HTTPie 逐端点验证

```bash
http POST :8000/todos title="学完 FastAPI"
```

```text
HTTP/1.1 201 Created

{
    "created_at": "2026-11-22T10:00:00",
    "done": false,
    "id": 1,
    "title": "学完 FastAPI"
}
```

判读：201 + 完整资源回显（id 是 refresh 同步回来的）；`done: false` 来自模型默认值；入站只传了 title——TodoIn 的契约在起作用。

```bash
http POST :8000/todos title=""                    # 422：违反 min_length=1
http :8000/todos                                  # 200：列表（数组，按 id 排序）
http :8000/todos/1                                # 200：详情
http :8000/todos/999                              # 404：{"detail":"待办不存在"}
```

```bash
http PATCH :8000/todos/1/toggle                   # 200 {"done": true, ...}
http PATCH :8000/todos/1 title="改个标题"         # 200：部分更新
http DELETE :8000/todos/1                         # HTTP/1.1 204（空正文）
http :8000/todos/1                                # 404：已删除
```

五个端点、五种状态码，与概念讲解的对照表逐一对上。最后打开 `http://127.0.0.1:8000/docs`——三个模型的字段表、每个端点的参数与响应示例全部自动生成。这就是分层的红利：**models 管库、schemas 管契约，FastAPI 把两者都变成文档**。

### 扩展清单：这个骨架接下来长什么

1. **分页**：`list_todos` 加 `page: int = 1, size: int = 20` 查询参数，SQL 补 `offset/limit`，响应包成 `{items, page, total}`（total 用 `select(func.count(Todo.id))` 统计）。
2. **过滤**：加 `done: bool | None = None` 参数，非 None 时 `.where(Todo.done == done)`——查「未完成」是待办应用最常用的入口。
3. **用户关联**：加 User 模型与 `user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))`，登录后从「当前用户」取 todo——这是通往多用户系统的第一步，也是下一站（认证）的伏笔。

## 常见坑

1. **坑 1：漏 session.refresh 就返回新建对象**。现象：POST 响应里 id 是 null，前端拿着 null 当主键继续请求。原因：自增 id 在 commit 时由数据库生成，对象不会自动拿到。排查：新建类端点 commit 后 refresh 再返回；修改类端点不需要（属性本就在对象上）。
2. **坑 2：404 用 return 糊弄**。现象：`return {"error": "不存在"}` 配 200。原因：架空了状态码——前端、监控、网关全靠状态码分流。排查：查不到一律 `raise HTTPException(404, ...)`；用 /docs 确认失败路径显示 404 而不是 200。
3. **坑 3：把 .db 文件提交进 Git**。现象：仓库里出现 todo.db，拉代码后数据库互相覆盖。原因：运行时数据当成了代码。排查：`.gitignore` 加 `*.db`；数据库文件只存在于运行环境。
4. **坑 4：路由函数里堆业务**。现象：一个函数查库、算逻辑、发通知、拼响应一百多行。原因：没有保持「路由薄」。排查：路由只做「接参数 → 调业务 → 返回」，逻辑抽成独立函数/模块，测试才有落点。
5. **坑 5：Session 用成全局变量**。现象：并发一上来偶发脏数据或锁报错。原因：Session 是一次对话不是基础设施。排查：对照第 3 步的 get_session——创建与清理走依赖注入；全局唯一的应该只有 Engine。
6. **坑 6：改了 models 忘删库（或忘迁移）**。现象：新字段一访问就报 no such column in todos。原因：create_all 不改旧表。排查：开发期删 todo.db 重启；有真实数据后必须换 Alembic 迁移。

## 小练习

1. 给 TodoIn 加 `priority: int = Field(default=0, ge=0, le=3)`，TodoOut 同步暴露；用 HTTPie 验证传 4（越界）返回 422 且 loc 指向 body.priority。
2. 按扩展清单实现分页：`GET /todos?page=2&size=5` 返回 `{items, page, total}`，并验证 total 是全量条数而不是当页条数。
3. 给 update_todo 加保护：TodoPatch 一个字段都没传时返回 422（提示：`exclude_unset()` 的结果为空就 raise）——思考为什么空 PATCH 算调用方的 bug。
4. **综合任务**：按扩展清单第 3 条给 todo-api 加 User（models 加表 + schemas 加 UserOut），实现 `GET /users/{id}/todos`；用 HTTPie 完整验证「建用户 → 建带用户的 todo → 按用户查列表」，把这条链路整理成你第一个接口测试清单。
