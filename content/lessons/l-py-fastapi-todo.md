---
id: l-py-fastapi-todo
slug: py-fastapi-todo
title: 实战：一个完整的待办事项 API
difficulty: 2
estMinutes: 45
tags: [FastAPI, 项目实战]
summary: 把 FastAPI、Pydantic、SQLAlchemy 三件工具拼成一个真实服务——分层清晰、校验齐全、文档自动，这个骨架能长成你的任何后端项目。
updated: 2026-11-22
resources:
  - id: r-fastapi-sql
    title: FastAPI · SQL Databases（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/sql-databases/
    type: doc
    difficulty: 2
    note: 本课代码结构的官方出处，扩展字段时对照着看。
  - id: r-httpie
    title: HTTPie（命令行接口调试）
    url: https://httpie.io/
    type: tool
    difficulty: 1
    note: 比 curl 更友好的调试工具，验证本课 API 用。
---

> 一句话定义：把前几课的零件（路由、模型、ORM）组装成**分层的完整服务**——这个 100 行的待办 API 就是你的第一个后端项目骨架。

## 概念讲解

先立好工程结构（每个文件一个职责，对照「代码规范」一课）：

```text
todo-api/
├── main.py     # 应用装配：FastAPI 实例 + 路由
├── models.py   # SQLAlchemy 表模型（数据库长什么样）
└── schemas.py  # Pydantic 出入站模型（接口契约长什么样）
```

**为什么 models 和 schemas 要分开？** models 描述「数据在库里怎么存」，schemas 描述「数据在接口上怎么进出」——生命周期不同（表结构改动少，接口契约是对前端的承诺）。混在一起，迟早出现「为了前端少传个字段去改数据库列」的事故。

依赖注入是 FastAPI 管理资源的方式：一个 `get_session()` 生成器，FastAPI 负责每个请求创建、用完关闭 Session——不用手写 try/finally。

## 代码示例

四个文件拼成一个能跑的完整服务：

```python
# models.py
from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase): ...

class Todo(Base):
    __tablename__ = "todos"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(50))
    done: Mapped[bool] = mapped_column(default=False)
```

```python
# schemas.py
from pydantic import BaseModel, Field

class TodoIn(BaseModel):
    title: str = Field(min_length=1, max_length=50)

class TodoOut(BaseModel):
    id: int
    title: str
    done: bool
```

```python
# main.py
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Base, Todo
from schemas import TodoIn, TodoOut

engine = create_engine("sqlite:///todo.db")
Base.metadata.create_all(engine)

app = FastAPI(title="Todo API")

def get_session():                      # 依赖注入：每请求一个 Session
    with Session(engine) as session:
        yield session

@app.post("/todos", response_model=TodoOut, status_code=201)
def create_todo(data: TodoIn, session: Session = Depends(get_session)):
    todo = Todo(**data.model_dump())
    session.add(todo)
    session.commit()
    session.refresh(todo)               # 让 id 回填到对象上
    return todo

@app.get("/todos", response_model=list[TodoOut])
def list_todos(session: Session = Depends(get_session)):
    return session.scalars(select(Todo)).all()

@app.patch("/todos/{todo_id}/toggle", response_model=TodoOut)
def toggle_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)   # 主键查询
    if not todo:
        raise HTTPException(404, "待办不存在")
    todo.done = not todo.done           # 原地取反
    session.commit()
    return todo
```

```bash
fastapi dev main.py
http POST :8000/todos title="学完 FastAPI"        # 201 {"id":1,"done":false,...}
http PATCH :8000/todos/1/toggle                   # {"done":true}
http :8000/todos
```

## 常见坑

1. **坑 1：`session.refresh` 漏掉**。commit 后对象的 id 可能还是 None——commit 后对新建对象 refresh 一次再返回。
2. **坑 2：404 用返回 dict 糊弄**。`return {"error": "不存在"}` 配 200 状态码是 REST 一课点名的反模式——该用 `raise HTTPException(404)`。
3. **坑 3：SQLite 文件没进 .gitignore**。`todo.db` 是运行时数据不是代码，提交进 Git 会污染历史。
4. **坑 4：一个函数干三件事**。路由里又查库又算业务又拼响应——保持「路由薄」，逻辑多了抽成独立函数，测试才好写。

## 小练习

1. 加 `DELETE /todos/{id}`（返回 204 无内容，查 FastAPI 文档 status_code=204 的注意事项）。
2. 给 Todo 加 `created_at` 字段并在 TodoOut 暴露，走一遍「改模型 → 删库重建 → 重测」流程。
3. 思考题：按「软件工程实践」的思路，给 toggle_todo 写一个 pytest 测试——你需要先解决什么依赖问题？
