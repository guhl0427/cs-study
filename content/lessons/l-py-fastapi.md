---
id: l-py-fastapi
slug: py-fastapi
title: FastAPI 起步：路由与自动文档
difficulty: 2
estMinutes: 85
tags: [FastAPI, Python, 后端]
summary: FastAPI 用类型注解声明接口——参数写对了，校验、转换、文档就全都自动有了，这是它和 Flask 最大的分野。本课从零写出文章 API 四个接口，读懂 422 结构化错误，并在 /docs 里完成第一次试调。
updated: 2026-11-22
resources:
  - id: r-fastapi-doc
    title: FastAPI 官方文档（中文）
    url: https://fastapi.tiangolo.com/zh/
    type: doc
    difficulty: 1
    note: 教程质量极高，本课对应「用户指南」的 Path/Query Parameters 章节。
  - id: r-fastapi-first-steps
    title: FastAPI · 第一步（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/first-steps/
    type: doc
    difficulty: 1
    note: 官方入门教程，/docs 与 OpenAPI 机制的出处。
  - id: r-uvicorn-doc
    title: Uvicorn 官方文档
    url: https://www.uvicorn.org/
    type: doc
    difficulty: 2
    note: 本课启动命令背后的 ASGI 服务器，部署上生产时回来查。
---

> 一句话定义：FastAPI 是**用类型注解写接口**的现代 Python Web 框架——你声明参数类型，它自动完成校验、转换、序列化和交互式文档，一个注解换回四样东西。

## 概念讲解

### FastAPI 在 Python Web 框架地图里的位置

「后端开发入门」讲过 REST：URL 定位资源、方法表达动作、状态码表达结果。Flask 和 Django 都能实现 REST，FastAPI 的分野在于**把 Python 的类型注解用到了极致**——注解不只是给人看的提示，而是框架行为的直接输入。

| 维度 | Flask | Django | FastAPI |
| ---- | ---- | ---- | ---- |
| 定位 | 微框架，零件自己挑 | 全家桶（ORM/后台/表单全带） | 现代微框架，专注 API |
| 参数校验 | 手写 if 或装扩展 | forms/serializer 另学 | 类型注解自带，声明即校验 |
| 接口文档 | 自己接 swagger 插件 | DRF 另配 | /docs 自动生成，还能网页试调 |
| 异步支持 | 需额外配置 | 部分支持 | 原生 async，异步同步可混写 |
| 适合场景 | 小而美的网站 | 内容型大站（带管理后台） | API 服务、微服务、AI 接口 |

选型口诀：**给前端/客户端供数据的 API 服务，FastAPI 是当下 Python 生态的首选**——「自动校验 + 自动文档」把接口联调成本砍掉一大半；要做带管理后台的内容大站，再考虑 Django。

### 三大自动能力：一个注解换回什么

看这一行路由函数签名：

```python
def read_article(article_id: int): ...    # 写了 int → 三件事自动发生
```

**能力一：自动校验。** 请求 `/articles/abc` 时，`"abc"` 转不成整数，FastAPI 在**进入你的函数之前**就拒绝请求：返回 422，并写清哪个参数、为什么不合格——你没写一行 if。校验发生在函数体之前，这就是「声明式」的含义：**你声明规则，框架执行规则**。

**能力二：自动转换。** URL 和查询串里拿到的永远是字符串（`"42"`、`"page=2"`），FastAPI 按注解自动转成 `int` 再交给你。对照 Flask：`request.args.get("page")` 拿到的是字符串，转 int、防 ValueError 都要自己写——FastAPI 把这层样板代码吃掉了。

**能力三：自动文档。** 注解 + 默认值 + 路由装饰器里的信息会被汇总成一份 OpenAPI 规范，`/docs` 网页据此渲染成交互式文档——参数、类型、默认值、响应示例一应俱全，还能直接在网页里发请求。

三个能力共享同一份信息源（类型注解），所以它们**永远和代码同步**——手写文档会过期，从注解生成的文档不会。

### 参数来源判别规则：三问定位

FastAPI 从函数签名自动判断每个参数从哪来，规则只有三问：

| 顺序 | 判别问题 | 参数来源 | 典型用途 | 示例 |
| ---- | ---- | ---- | ---- | ---- |
| ① | 名字出现在路径模板 `{xxx}` 里？ | 路径参数 | 资源标识（哪一篇） | `read(article_id: int)` 配 `/articles/{article_id}` |
| ② | 类型是一个 Pydantic 模型类？ | 请求体 | 新建/更新的数据（下一课） | `create(article: ArticleIn)` |
| ③ | 都不是（普通类型 + 默认值）？ | 查询参数 | 过滤、分页、搜索 | `list(page: int = 1, q: str \| None = None)` |

两条细则：有默认值 → 该参数可选（不传就用默认）；类型里带 `None`（如 `str | None = None`）→ 可选且可为空。判别口诀：**在路径里是路径参数，是模型就是请求体，其余带默认值的是查询参数**。

### /docs 与 OpenAPI：文档即契约

`http://127.0.0.1:8000/docs` 这个网页的背后，是一份机器可读的 JSON 规范——`http://127.0.0.1:8000/openapi.json`。**OpenAPI 是描述「接口长什么样」的行业标准格式**：有哪些路径、各接受什么参数、返回什么结构、错误长什么样。

「软件工程 · 接口调试」一课讲过「文档即契约」：前后端并行开发时，前端照契约先 mock、不等后端写完；联调出分歧时以契约为准。FastAPI 把这件事自动化了——**契约不再是一份会过期的 Word 文档，而是从代码实时生成的 JSON**。/docs（Swagger UI）只是这份契约的阅读器之一；同一份 openapi.json 还能生成 TypeScript 类型、mock 数据、接口测试用例——这就是「契约优先」工具链的红利。

### 422：结构化错误怎么读

参数不合法时，FastAPI 返回 422 Unprocessable Entity，响应体是结构化的：

```json
{
  "detail": [
    {
      "type": "int_parsing",
      "loc": ["path", "article_id"],
      "msg": "Input should be a valid integer, unable to parse string as an integer",
      "input": "abc"
    }
  ]
}
```

逐字段读法：`loc` 是错误位置——`["path", "article_id"]` 表示「路径参数 article_id」，请求体字段则形如 `["body", "title"]`；`msg` 是给人看的原因；`type` 是给程序看的错误码（前端可据此做针对性提示）；`input` 回显你实际传的值。**排错动作：先看 loc 定位字段，再看 msg 看原因**——框架已经把问题指到字段级，别再把 422 当玄学。

### 一次请求在 FastAPI 里的完整旅程

```text
GET /articles/abc
   │
   ▼
① 路由匹配：按注册顺序逐条尝试 /articles/{article_id}
   │
   ▼
② 参数提取与校验：从 URL 抠出 "abc"，按注解尝试转 int
   │
   ├─ 转不动 → ③ 直接返回 422，你的函数根本不会执行
   │
   ▼ 转成功
④ 执行函数体：拿到干净的 article_id（已经是 int）
   │
   ▼
⑤ 返回值自动序列化为 JSON，并同步写进 /docs 的响应示例
```

读懂这条管线就明白两件事：为什么校验代码不用写在函数里（②已经做了）；为什么 422 出现时函数里的 print 一条都没输出（函数压根没被调用）。

## 代码示例

主线任务：从零写出一个「文章 API」——详情、列表（分页 + 关键词）、创建、删除四个接口，每一步都有验证输出。全程约 30 分钟。

### 第 0 步：安装与启动

```bash
pip install "fastapi[standard]"     # 一次装齐 fastapi + uvicorn 服务器 + 启动工具
```

### 第 1 步：详情接口——路径参数登场

```python
# main.py
from fastapi import FastAPI, HTTPException

app = FastAPI(title="文章 API")            # title 会显示在 /docs 页头

articles: dict[int, dict] = {
    1: {"id": 1, "title": "Hello FastAPI", "views": 0},
    2: {"id": 2, "title": "路由与自动文档", "views": 3},
}

@app.get("/articles/{article_id}")
def read_article(article_id: int):         # 注解 int → 自动校验 + 自动转换
    if article_id not in articles:
        raise HTTPException(status_code=404, detail="文章不存在")
    return articles[article_id]            # dict 自动序列化为 JSON
```

```bash
fastapi dev main.py                        # 开发服务器，改代码自动重载
# INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

注意：直接 `python main.py` 什么都不发生——FastAPI 应用只是个对象，服务器不会自己启动；必须用 `fastapi dev`（开发）或 `uvicorn main:app`（部署）。

### 第 2 步：列表接口——查询参数登场

```python
@app.get("/articles")
def list_articles(page: int = 1, size: int = 10, keyword: str | None = None):
    # 三个普通参数都不在路径里 → 全是查询参数；有默认值 → 全部可选
    data = [a for a in articles.values()
            if keyword is None or keyword in a["title"]]
    start = (page - 1) * size
    return {"page": page, "size": size, "data": data[start:start + size]}
```

请求 `/articles?page=2&keyword=Fast`：`page`、`keyword` 自动从查询串提取并转型，函数拿到的已经是 `int` 和 `str | None`——查询串的解析、容错全部由框架完成。

### 第 3 步：创建与删除——请求体初体验

```python
from pydantic import BaseModel

class ArticleIn(BaseModel):                # 请求体模型（下一课全面展开）
    title: str                             # 必填：不传就 422
    views: int = 0                         # 默认值 → 可选

@app.post("/articles", status_code=201)
def create_article(article: ArticleIn):    # 模型类型参数 → 自动解析请求体 JSON
    new_id = max(articles) + 1 if articles else 1
    saved = {"id": new_id, **article.model_dump()}
    articles[new_id] = saved
    return saved                           # 201 Created：回显新资源

@app.delete("/articles/{article_id}", status_code=204)
def delete_article(article_id: int):
    if article_id not in articles:
        raise HTTPException(status_code=404, detail="文章不存在")
    del articles[article_id]               # 204 No Content：成功且无正文
```

对照 REST 课的状态码约定：创建成功 201、删除成功 204、资源不存在 404、参数不合法 422——`status_code=` 参数让响应状态回归本位，而不是所有请求都糊一个 200。

### 第 4 步：在 /docs 里试调

浏览器打开 `http://127.0.0.1:8000/docs`：

1. 四个接口全部列出；点开 `POST /articles` → **Try it out**；
2. 请求体编辑框里预填了 ArticleIn 的示例（title 必填、views 默认 0）——模型自动变成了文档；
3. 填入 `{"title": "来自文档的问候"}` → **Execute**；
4. 下方立刻显示 `Server response: Code 201` 和响应 JSON。

再制造一次失败：把 title 删掉再 Execute——得到 `Code 422`，detail 指向 `["body", "title"]`。**文档页本身就是测试台**，这是「契约可执行」最直观的体验。

### 第 5 步：curl 验证——覆盖 200/201/204/404/422

```bash
curl "http://127.0.0.1:8000/articles/1"
```

```json
{"id": 1, "title": "Hello FastAPI", "views": 0}
```

```bash
curl "http://127.0.0.1:8000/articles/abc"        # 422：路径参数转不成 int
curl -i "http://127.0.0.1:8000/articles/999"     # -i 显示响应头
```

```text
HTTP/1.1 404 Not Found
content-type: application/json

{"detail": "文章不存在"}

# 第二条命令的 422 响应体：
{"detail": [{"type": "int_parsing", "loc": ["path", "article_id"],
  "msg": "Input should be a valid integer, unable to parse string as an integer",
  "input": "abc"}]}
```

判读：404 的 detail 是我们自己写的业务文案；422 的 detail 是框架生成的字段级错误——**两种错误来源不同（业务 vs 校验），但都走结构化 detail，前端处理方式统一**。

```bash
curl -X POST "http://127.0.0.1:8000/articles" \
  -H "Content-Type: application/json" \
  -d '{"title": "curl 创建的文章", "views": 5}'
```

```json
{"id": 3, "title": "curl 创建的文章", "views": 5}
```

```bash
curl -i -X DELETE "http://127.0.0.1:8000/articles/3"
# HTTP/1.1 204 No Content（空正文）
```

四条 curl 对应四个接口加两类错误：详情 200、非法参数 422、不存在 404、创建 201、删除 204。**类型校验、状态码语义、自动文档，在这一条主线里全部落地。**

## 常见坑

1. **坑 1：路由顺序——具体路径被参数路由吞掉**。现象：`/articles/me` 报 422 说 article_id 转不成整数。原因：FastAPI 按注册顺序匹配，`/articles/{article_id}` 先注册就把 `"me"` 当参数捕获了。排查：在 /docs 里核对接口排列顺序（即注册顺序）；把更具体的路径（`/articles/me`、`/articles/latest`）注册在参数路由**之前**。
2. **坑 2：路径参数漏写类型注解**。现象：`/articles/010` 和 `/articles/10` 行为不一致，参数全被当字符串。原因：没有 `: int`，框架失去校验和转换的依据。排查：给每个路径参数补注解，/docs 里参数类型应标为 integer。
3. **坑 3：`python main.py` 以为能启动服务**。现象：命令瞬间结束，端口上什么都没有。原因：应用对象不会自己拉起服务器。排查：开发用 `fastapi dev main.py`；生产用 `uvicorn main:app --host 0.0.0.0 --workers 4`，别把 dev 命令带上生产。
4. **坑 4：查询参数忘给默认值**。现象：前端不传 page 就被 422 拒绝。原因：无默认值 = 必填。排查：可选参数一律给默认值（`page: int = 1`）；确需必填的保留，并在文档里写清。
5. **坑 5：错误塞进 200 响应**。现象：`return {"error": "文章不存在"}` 配 200。原因：架空了 HTTP 状态码，监控告警、网关重试、前端分流全部失效。排查：错误一律 `raise HTTPException(status_code, detail)`，让 404 真的是 404。
6. **坑 6：改了代码不生效**。现象：接口行为和代码对不上。原因：服务器启动时没带自动重载。排查：确认用 `fastapi dev` 启动（自带 reload）；看终端最近一次 "Application startup" 的时间戳。

## 小练习

1. 给 `list_articles` 加 `order: str = "desc"` 查询参数实现按 views 升/降序，在 /docs 里确认参数说明自动更新（顺便观察文档如何展示默认值）。
2. 亲手复现坑 1：把 `/articles/me`（返回固定示例）注册到参数路由之后，curl 一次看 422，再调整顺序修复——用一次实验记住路由顺序规则。
3. 新增 `GET /articles/latest`（返回 views 最高的一篇），思考它注册在详情路由之后是否安全，动手验证你的判断。
4. **综合任务**：为文章 API 补上 `PUT /articles/{article_id}`（全量更新），实现完整 CRUD；在 /docs 里对每个接口做「一次成功 + 一次失败」试调，整理出 5 种状态码（200/201/204/404/422）各自的触发条件清单。
