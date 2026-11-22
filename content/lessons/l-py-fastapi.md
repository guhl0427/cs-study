---
id: l-py-fastapi
slug: py-fastapi
title: FastAPI 起步：路由与自动文档
difficulty: 2
estMinutes: 40
tags: [FastAPI, Python, 后端]
summary: FastAPI 用类型注解声明接口——参数写对了，校验、文档、序列化就全都自动有了，这是它和 Flask 最大的分野。
updated: 2026-11-22
resources:
  - id: r-fastapi-doc
    title: FastAPI 官方文档（中文）
    url: https://fastapi.tiangolo.com/zh/
    type: doc
    difficulty: 1
    note: 教程质量极高，本节内容对应「用户指南」前几章。
  - id: r-fastapi-play
    title: Google Colab
    url: https://colab.research.google.com/
    type: tool
    difficulty: 1
    note: 没装环境也能跑：笔记本里 pip install fastapi 后用 nginx 反代试运行。
---

> 一句话定义：FastAPI 是**用类型注解写接口**的现代 Python Web 框架——你声明参数类型，它自动完成校验、序列化和交互式文档。

## 概念讲解

「后端开发入门」讲过 REST：URL 定位资源、方法表达动作。Flask/Django 都能实现，FastAPI 的差异在于**把 Python 的类型注解用到了极致**：

```python
def get_user(user_id: int):    # 写了 int → 它替你校验、转换、写文档
```

三个自动能力，全部来自这一个注解：

1. **参数校验**：`/users/abc` 自动返回 422 错误（“user_id 不是整数”），不用手写 if 判断；
2. **类型转换**：URL 里的字符串 `"42"` 自动转成 int；
3. **接口文档**：访问 `/docs` 得到一份基于 OpenAPI 的交互式文档（每个接口可以直接在网页里试调）——正是「接口调试」一课说的「文档即契约」，FastAPI 让契约自动生成。

路径参数、查询参数、请求体各就各位：

| 参数来源 | 写法 | 典型用途 |
| ---- | ---- | ---- |
| 路径参数 | `/items/{item_id}` | 资源标识 |
| 查询参数 | 函数签名里的普通参数 | 过滤、分页 |
| 请求体 | Pydantic 模型参数（下一课） | 新建/更新的数据 |

## 代码示例

从零到第一个可调用的 API（`main.py`）：

```bash
pip install "fastapi[standard]"    # 一次装齐 fastapi + uvicorn 服务器
```

```python
from fastapi import FastAPI

app = FastAPI(title="文章 API")     # 应用实例，title 会出现在文档里

articles = {1: {"id": 1, "title": "Hello FastAPI"}}

@app.get("/articles/{article_id}")          # 路径参数
def read_article(article_id: int):          # 注解 int → 自动校验转换
    if article_id not in articles:
        return {"error": "文章不存在"}       # 简化示例；规范做法见下一课
    return articles[article_id]

@app.get("/articles")                        # 查询参数：?page=1&size=10
def list_articles(page: int = 1, size: int = 10):
    return {"page": page, "size": size, "data": list(articles.values())}
```

```bash
fastapi dev main.py            # 开发服务器，带自动重载
# 浏览器打开 http://127.0.0.1:8000/docs → 交互式文档
curl "http://127.0.0.1:8000/articles/1"      # {"id":1,"title":"Hello FastAPI"}
curl "http://127.0.0.1:8000/articles/abc"    # 422，detail: Input should be a valid integer
curl "http://127.0.0.1:8000/articles?page=2"
```

注意第二条 curl：没写一行校验代码，错误响应是结构化的 422——这就是「注解即校验」。

## 常见坑

1. **坑 1：路径参数不写类型注解**。`def read(article_id)` 没有 `: int`，FastAPI 只能当字符串处理，`/articles/10` 和 `/articles/010` 就是两个不同的 key——永远给参数写注解。
2. **坑 2：路由顺序**。`/articles/me` 这类具体路径必须注册在 `/articles/{article_id}` **之前**，否则 "me" 被当成 article_id 匹配走（然后 422）。
3. **坑 3：用 `run` 跑了 flask 的方式**。FastAPI 自带命令是 `fastapi dev main.py`（或 uvicorn main:app --reload）；直接 `python main.py` 什么都不发生，因为没有服务器启动代码。
4. **坑 4：生产环境用 dev 命令**。`fastapi dev` 是开发用的；部署用 `uvicorn main:app --host 0.0.0.0 --workers 4`。

## 小练习

1. 把示例扩展一个 `DELETE /articles/{article_id}` 路由，用 `/docs` 网页里直接试调一次删除。
2. 给 `list_articles` 加 `status: str | None = None` 查询参数，观察 /docs 文档里它自动变成可选下拉。
3. 思考题：和「后端开发入门」的 REST 约定对照——FastAPI 的哪些默认行为帮你省掉了「所有错误都返回 200」这个坑？
