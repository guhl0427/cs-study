---
id: l-py-pydantic
slug: py-pydantic
title: Pydantic：类型即校验
difficulty: 2
estMinutes: 40
tags: [Pydantic, FastAPI, 数据校验]
summary: 请求体进来先过 Pydantic 模型这道安检门——字段类型、必填、范围全在声明里，非法数据在门口就被拦下。
updated: 2026-11-22
resources:
  - id: r-pydantic-doc
    title: Pydantic 官方文档
    url: https://docs.pydantic.dev/latest/
    type: doc
    difficulty: 2
    note: 模型与校验器的权威参考，重点看 Models 章节。
  - id: r-fastapi-body
    title: FastAPI · Request Body（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/body/
    type: doc
    difficulty: 1
    note: 官方教程里 Pydantic 模型与请求体的配合。
---

> 一句话定义：Pydantic 把「数据长什么样」写成**带类型的类**——数据进门先过它的安检，不合规直接打回，合规的已经是干净的 Python 对象。

## 概念讲解

上一课的路径参数用 `int` 注解就够了，但 POST/PUT 的**请求体**（JSON）是一坨没有类型的字典，字段漏了、类型错了、值越界了都得自己防。Pydantic 的答案：把请求体定义成模型类：

```python
class ArticleIn(BaseModel):
    title: str                                    # 必填：没传就 422
    tag: str = "general"                          # 默认值 → 自动变可选
    views: int = Field(default=0, ge=0)           # 范围约束：不能是负数
```

这个类同时是**四样东西**：

1. **校验器**：缺 title、views=-5 → 请求被 FastAPI 用 422 拒之门外，detail 里写清哪个字段为什么不合格；
2. **解析器**：合法的 JSON 自动变成 `article.title` 这样的对象属性——不用 `data["title"]` 手取；
3. **文档源**：/docs 里自动展示这个模型的字段表，前端照着写就行；
4. **序列化器**：`.model_dump()` 转回 dict、`.model_dump_json()` 转 JSON，出站数据同样有保证。

错误响应的形态（机器可读 + 人类可读，正是 REST 一课说的「结构化错误」）：

```json
{
  "detail": [
    { "loc": ["body", "views"], "msg": "Input should be greater than or equal to 0", "type": "greater_than_equal" }
  ]
}
```

## 代码示例

把 Pydantic 模型接入 FastAPI，完成一个校验齐全的创建接口：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

class ArticleIn(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    tag: str = "general"
    views: int = Field(default=0, ge=0)

class ArticleOut(ArticleIn):        # 出站模型：多一个 id
    id: int

db: dict[int, ArticleOut] = {}
next_id = 1

@app.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(article: ArticleIn):        # 请求体参数：类型是模型
    global next_id
    saved = ArticleOut(id=next_id, **article.model_dump())
    db[next_id] = saved
    next_id += 1
    return saved                                # response_model 保证出站字段干净

@app.get("/articles/{article_id}", response_model=ArticleOut)
def read_article(article_id: int):
    if article_id not in db:
        raise HTTPException(status_code=404, detail="文章不存在")   # 规范的 404
    return db[article_id]
```

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" -d '{"title": "", "views": -1}'
# 422：title 太短 + views 必须大于等于 0 —— 两个错误一起报出
curl -X POST ... -d '{"title": "Hello"}'      # 201 {"id":1,"title":"Hello","tag":"general","views":0}
```

## 常见坑

1. **坑 1：入站出站共用一个模型**。创建时客户端不该传 id，读取时又必须返回 id——用 `ArticleIn`/`ArticleOut` 两个模型分开声明，`response_model` 控制出站字段。
2. **坑 2：可变默认值**。`tags: list[str] = []` 直接写在类里是危险写法（共享默认列表），要用 `Field(default_factory=list)`。
3. **坑 3：校验逻辑写进路由函数**。模型能表达的范围、长度、格式约束就放在 Field/模型里；路由函数里只留业务校验（如「标题是否重复」）。校验规则散在函数里，文档就看不见了。
4. **坑 4：以为 422 是 bug**。测试时看到 422 别慌——它正是 Pydantic 在干活，读 detail 里的 loc 和 msg 定位字段。

## 小练习

1. 给 `ArticleIn` 加 `status: str = Field(pattern="^(draft|published)$")`，发一个非法 status 观察 422 的 msg。
2. 实现第二个模型 `ArticleUpdate`（所有字段可选），写 `PATCH /articles/{id}` 只更新传了的字段（提示：`article.model_dump(exclude_unset=True)`）。
3. 思考题：对照「软件工程实践」的测试一课——为什么说 Pydantic 让「输入校验」天然可测？
