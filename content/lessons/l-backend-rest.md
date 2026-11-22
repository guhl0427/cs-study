---
id: l-backend-rest
slug: rest
title: RESTful API 设计：前后端协作的契约
difficulty: 2
estMinutes: 85
tags: [REST, API, 后端]
summary: URL 定位资源、方法表达动作、状态码表达结果——REST 三件套逐个讲透，跟着把一个「文章模块」的 API 设计到能开工。
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

## 常见坑

1. **坑 1：GET 带副作用**。用 `GET /api/like?id=42` 做点赞——预取、爬虫、浏览器刷新都会触发 GET，点赞被意外执行。改数据的动作必须 POST/PUT/DELETE（呼应网络课的方法语义）。
2. **坑 2：URL 里塞动词**。`/getUserById` 是把 RPC 习惯带进 REST；动作已由方法表达，URL 只留名词资源。
3. **坑 3：所有错误都返回 200**。200 + body 里 `"success": false` 让前端和监控都无法按状态码分流——让状态码回归本位，body 只放业务数据或结构化错误。
4. **坑 4：PATCH 与 PUT 混用不清**。PUT 全量替换（缺的字段等于被清空的风险），PATCH 局部更新——语义用错会静默丢字段。
5. **坑 5：版本号缺失**。接口改形状会砸到已上线的客户端——路径版本 `/api/v1/...` 是最简单的保险，破坏性变更升 v2。
6. **坑 6：列表接口无分页**。`GET /articles` 一把梭全表——数据量增长后拖垮前端与数据库；分页从第一天就是默认。

## 小练习

1. 为「待办清单」设计完整 REST 契约：列表（按日期过滤）、新建、改状态（PATCH）、删除，写出每个端点与方法并说明状态码。
2. 指出 `GET /api/clearCart` 违反的两条约定，改写成 REST 版本（提示：购物车是资源，清空是全量替换）。
3. 综合任务：把本课契约在 FastAPI（或你熟悉的框架）里实现到「能 curl 走通全部端点」，用 DevTools/Postman 逐个验证状态码。
4. 思考题：为什么 PUT 要求幂等而 POST 不要求？这影响哪种网络重试场景？（提示：超时后能不能安全重发。）
