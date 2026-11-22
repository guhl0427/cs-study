---
id: l-backend-rest
slug: rest
title: RESTful API 设计：前后端协作的契约
difficulty: 2
estMinutes: 85
tags: [REST, API, 后端]
summary: URL 定位资源、方法表达动作、状态码表达结果——REST 三件套逐个讲透，对照 GitHub 真实 API 验证约定，跟着把一个「文章模块」的 API 设计到能开工。
updated: 2026-11-22
resources:
  - id: r-rest-mdn
    title: MDN · HTTP 方法
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Methods
    type: doc
    difficulty: 2
    note: 方法语义与幂等性的权威说明。
  - id: r-rest-guide
    title: RESTful API 设计指南（中文译站）
    url: https://www.restapitutorial.com/
    type: doc
    difficulty: 2
    note: 设计经验合集，本课的约定与其一致。
  - id: r-rest-github
    title: GitHub REST API 官方文档
    url: https://docs.github.com/rest
    type: doc
    difficulty: 2
    note: 真实大厂 REST 实现的活样本，本课第 6 步的对照对象。
---

> 一句话定义：REST 是一套**用 HTTP 原生语义组织接口**的约定——URL 名词定位资源、方法表达动作、状态码表达结果，让前端看到接口就知道怎么调。

## 概念讲解

**为什么要有约定？** 没有约定时每个后端自创接口风格：`/getUserById`、`/deleteArticle?id=1`、`/api/doSomething`——前端每接一个接口都要读文档猜语义。REST 把表达义务分给 HTTP 自带的三大原生机制，接口「自解释」：

```text
① URL（名词）     → 定位资源：/articles/42 就是「42 号文章」
② 方法（动词）    → 表达动作：GET 读、POST 建、PUT/PATCH 改、DELETE 删
③ 状态码（结果）  → 表达结果：200 成功、404 不存在、422 你发的东西不合规
```

**资源思维是 REST 的心智转折**：把系统里的「东西」先列出来（文章、用户、评论），每个东西一个 URL；动作不是 URL 的一部分，由方法承担。对比一眼分晓：

```text
❌ RPC 风格：POST /api/deleteArticle   POST /api/getUserById
✅ REST 风格：DELETE /articles/42      GET  /users/7
```

**方法的完整语义表**（幂等 = 重复调用结果一致，重试安全性的依据）：

| 方法 | 语义 | 幂等 | 典型场景 |
| ---- | ---- | ---- | ---- |
| GET | 读取，无副作用 | ✓ | 列表、详情 |
| POST | 新建/触发 | ✗ | 创建文章、下单 |
| PUT | 全量替换 | ✓ | 整个更新用户资料 |
| PATCH | 局部更新 | 通常✓ | 只改标题 |
| DELETE | 删除 | ✓ | 删除文章 |

**幂等性为什么等于重试安全？** 网络调用有个绕不开的现实：请求超时后，调用方不知道服务器到底执行了没有——可能是请求没送达，也可能是执行完了、响应在路上丢了。唯一的自救手段就是重发，而重发安全的前提正是幂等：GET/PUT/DELETE 执行一次和一百次效果一致，重发只是多算一遍同样的账；POST 不幂等，重发就可能重复下单、重复扣款。生产环境对非幂等 POST 的补救是**幂等键（Idempotency-Key）**：客户端为每次业务动作生成一个唯一 key 一并提交，服务器发现同一 key 重复到达就返回第一次的结果——用约定的幂等，弥补方法本身的非幂等。

**三种接口风格的定位对照**（知道 REST 在地图上的位置）：

| 维度 | RPC 风格 | REST | GraphQL |
| ---- | ---- | ---- | ---- |
| URL 形态 | 动词（/getUser） | 名词资源（/users/7） | 统一入口（/graphql） |
| 动作表达 | 塞进 URL/参数 | HTTP 方法 | query 字段名 |
| 返回数据粒度 | 服务端写死 | 服务端定 | 客户端按需取 |
| 适合 | 内部微服务紧耦合 | 开放 API、CRUD | 多端取数差异大 |

补一句教科书级的概念：REST 的提出者 Fielding 还定义过 **HATEOAS**——响应里附带「下一步能做什么」的链接（如 `"actions": {"like": "/articles/42/favorite"}`），客户端顺着链接走、不用读文档。这是纯 REST 的最高成熟度，实际工程大多只做到「URL+方法+状态码」三层，知道即可，不必强求。

**真实 API 风格对照：GitHub API 实例**——学约定最有效的办法是看大厂怎么做。GitHub REST API 是教科书级的实践：

```text
GET    /repos/octocat/hello-world            读仓库详情（owner/repo 两级归属）
PATCH  /repos/octocat/hello-world            局部更新（只改 description）
DELETE /repos/octocat/hello-world            删除仓库
GET    /repos/octocat/hello-world/issues     仓库下的 issue 列表（嵌套子资源）
GET    /repos/octocat/hello-world/issues?state=open&per_page=30&page=2
                                              过滤 + 分页全走查询参数
PUT    /repos/octocat/hello-world/collaborators/{user}
                                              添加协作者（PUT：幂等地建立关联）
```

逐条对照本课约定：URL 全是名词资源、嵌套只到两层；动作全靠方法表达；分页 `page`/`per_page` 放查询参数；错误返回统一的结构化 JSON；响应头还带 `X-RateLimit-Remaining`（剩余调用额度）和 `Link: <...>; rel="next"`（下一页在哪）。**读懂这一段，你就有能力看懂任何一家开放 API 的文档了**。

**嵌套表达归属**：`GET /users/7/articles` = 7 号用户的文章列表——嵌套不超过两层，更深的关系用查询参数（`/articles?author=7`）。

**集合与分页的约定**：列表是「集合资源」，过滤/分页/排序全部放查询参数，且要有统一形状的响应：

```text
GET /articles?tag=css&page=2&size=20&sort=-created_at
```

```json
{
  "data": [{ "id": 42, "title": "…" }],
  "page": { "current": 2, "size": 20, "total": 137 }
}
```

**错误响应也是契约**：结构化错误（机器可读的 code + 人类可读的 message + 可选的字段级 detail）让前端能决定「重试还是提示用户」——「所有错误都返回 200」是反模式，监控和前端都失去按码分流的能力。

**API 设计评审清单**——开工前前后端对着它过一遍，能拦下八成接口扯皮：

```text
□ URL 全是名词资源，没有动词（/articles，不是 /getArticles）
□ 动作只用方法表达：读 GET / 建 POST / 全改 PUT / 局改 PATCH / 删 DELETE
□ 每个端点都定好成功与失败状态码（201/204/404/422…），拒绝 200 包打天下
□ 错误结构统一（code + message + detail），前端能按 code 分流
□ 列表必有分页（page/size/total），过滤排序走查询参数
□ 写接口过一遍幂等：重复提交会怎样？POST 动作要不要幂等键？
□ 嵌套不超过两层，更深的关系用查询参数
□ 版本号与命名规范先行（/api/v1/...），破坏性变更升版本不砸老客户端
```

这份清单的价值不是考试，而是协作时提供**中立的语言**——评审不说「你这样写不好」，而说「清单第 2 条没过」。

## 代码示例

主线：把「文章收藏」模块从需求设计到完整契约——先写契约再写代码（设计先行是团队习惯）：

**第 1 步：列资源与动作**（动手前先在纸上画）：

```text
资源：文章 article、收藏 favorite（文章的子资源）
动作：列表/详情/创建/编辑/删除/收藏/取消收藏
```

**第 2 步：写出完整契约**：

```text
GET    /api/articles?tag=css&page=1     列表（过滤/分页）
POST   /api/articles                    新建（201 返回新资源）
GET    /api/articles/42                 详情
PATCH  /api/articles/42                 局部更新（只传变化字段）
DELETE /api/articles/42                 删除（204 无内容）
PUT    /api/articles/42/favorite        收藏（幂等：重复收藏结果一致）
DELETE /api/articles/42/favorite        取消收藏
```

**第 3 步：约定响应与错误形状**：

```json
// 成功（创建）：201
{ "id": 43, "title": "Hello", "tag": "css" }
// 失败：422 + 字段级 detail（前端可精准标红哪个输入框）
{
  "code": "VALIDATION_FAILED",
  "message": "请求参数不合规",
  "detail": [{ "field": "title", "message": "长度需在 1-50 之间" }]
}
```

**第 4 步：对照实现**（FastAPI 最小验证，呼应实战课）：

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI()
db: dict[int, dict] = {}
next_id = 1

class ArticleIn(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    tag: str = "general"

@app.post("/api/articles", status_code=status.HTTP_201_CREATED)
def create(article: ArticleIn):          # 422 由模型自动返回，形状含 detail
    global next_id
    db[next_id] = {"id": next_id, **article.model_dump()}
    next_id += 1
    return db[next_id - 1]

@app.delete("/api/articles/{aid}", status_code=status.HTTP_204_NO_CONTENT)
def remove(aid: int):
    if aid not in db:
        raise HTTPException(404, "文章不存在")     # 状态码回归本位
    del db[aid]
```

**第 5 步：补上收藏子资源，亲手验证幂等**：

```python
@app.put("/api/articles/{aid}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def favorite(aid: int):
    if aid not in db:
        raise HTTPException(404, "文章不存在")
    db[aid]["favorited"] = True        # 关键：设为 True，不是计数 +1

@app.delete("/api/articles/{aid}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def unfavorite(aid: int):
    if aid not in db:
        raise HTTPException(404, "文章不存在")
    db[aid]["favorited"] = False
```

```bash
curl -i -X PUT http://127.0.0.1:8000/api/articles/1/favorite   # 204
curl -i -X PUT http://127.0.0.1:8000/api/articles/1/favorite   # 仍是 204
```

输出说明了什么：两次 PUT 收到的都是 `204 No Content`——幂等从此可观测：收藏是「把状态设为真」而非「计数加一」，重复调用结果不叠加。反过来想，若用 POST 实现「点赞数 +1」，重复提交就会多加——那种场景就必须靠幂等键兜底。这就是语义表里 PUT ✓ / POST ✗ 的代码级含义。

**第 6 步：去 GitHub API 实测一次**（把课堂契约放进真实世界验证）：

```bash
curl -sI https://api.github.com/repos/octocat/hello-world
```

预期输出（节选）：

```text
HTTP/2 200
x-ratelimit-limit: 60
x-ratelimit-remaining: 55
```

判读：`200` 是状态码本位；`x-ratelimit-remaining` 是大厂 API 的「使用额度报告」——未认证游客每小时 60 次，超了会收到 403。看懂响应头，你就完成了从「会读接口」到「会审接口」的跨越。

## 常见坑

1. **坑 1：GET 带副作用**。现象：用 `GET /api/like?id=42` 做点赞，点赞数莫名暴涨。原因：预取、爬虫、浏览器刷新都会触发 GET（呼应网络课的方法语义）。排查与对策：改数据的动作必须 POST/PUT/DELETE，GET 只留只读。
2. **坑 2：URL 里塞动词**。现象：`/getUserById` 和 `/articles/7` 混着出现，前端猜不透风格。原因：把 RPC 习惯带进了 REST。排查与对策：逐个端点检查——动作已由方法表达，URL 只留名词资源。
3. **坑 3：所有错误都返回 200**。现象：接口永远 200，错误要靠 body 里 `"success": false` 判断。原因：只把状态码当传输包装。排查与对策：让状态码回归本位，body 只放业务数据或结构化错误；监控与前端都按码分流。
4. **坑 4：PATCH 与 PUT 混用不清**。现象：用 PUT 更新昵称后，其他字段被清空了。原因：PUT 是全量替换，没传的字段等于被替换成空。排查与对策：局部更新一律 PATCH（只传变化字段）；PUT 留给「整份提交」。
5. **坑 5：版本号缺失**。现象：接口改了字段名，已上线的小程序批量报错。原因：契约单方面变更，老客户端没有缓冲期。排查与对策：路径版本 `/api/v1/...` 从第一天就有，破坏性变更升 v2 而不是改 v1。
6. **坑 6：列表接口无分页**。现象：`GET /articles` 一把梭全表，上线初期没事，三个月后接口越来越慢。原因：数据量随业务增长，无分页接口的响应体积与数据库扫描线性变大。排查与对策：分页从第一天就是默认，`page/size/total` 三件套进契约。

## 小练习

1. 为「待办清单」设计完整 REST 契约：列表（按日期过滤）、新建、改状态（PATCH）、删除，写出每个端点与方法并说明状态码。
2. 指出 `GET /api/clearCart` 违反的两条约定，改写成 REST 版本（提示：购物车是资源，清空是全量替换）。
3. 综合任务：把本课契约（含第 5 步的收藏端点）在 FastAPI（或你熟悉的框架）里实现到「能 curl 走通全部端点」，用 DevTools/Postman 逐个验证状态码，并对收藏端点连续调用两次验证幂等。
4. 思考题：为什么 PUT 要求幂等而 POST 不要求？这影响哪种网络重试场景？（提示：超时后能不能安全重发。）如果必须为「下单 POST」设计重试安全，幂等键该怎么用？
