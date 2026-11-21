---
id: l-backend-rest
slug: rest
title: RESTful API 设计
difficulty: 2
estMinutes: 40
tags: [后端, API]
summary: URL 定位资源、方法表达动作、状态码传递结果——把这三个约定想通，API 设计就有了骨架。
updated: 2026-11-22
resources:
  - id: r-rest-mdn
    title: MDN · HTTP 方法
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Methods
    type: doc
    difficulty: 2
    note: 各方法的语义与「是否幂等」的权威说明。
---

> 一句话定义：REST 是一套 API 设计约定——用 URL 指向「资源」，用 HTTP 方法表达「动作」，用状态码表达「结果」。

## 概念讲解

上一门网络课讲过：HTTP 方法有语义（GET 读、POST 建、PUT 改、DELETE 删）。REST 把这件事变成设计原则：

| 动作 | 约定写法 | 说明 |
| ---- | ---- | ---- |
| 列出文章 | `GET /articles` | 复数名词表达资源集合 |
| 读单篇 | `GET /articles/42` | 42 是资源标识 |
| 新建 | `POST /articles` | 数据放请求体 |
| 全量更新 | `PUT /articles/42` | 幂等：重复调用结果一致 |
| 局部更新 | `PATCH /articles/42` | 只传变化的字段 |
| 删除 | `DELETE /articles/42` | 幂等 |

两条高频纪律：**URL 用名词不用动词**（`DELETE /articles/42`，而不是 `/deleteArticle?id=42`——动作已经由方法表达了）；**过滤与分页放查询参数**（`GET /articles?author=guhl&page=2&size=20`）。

还有一层「嵌套关系」表达归属：`GET /users/7/articles` = 7 号用户的文章列表，嵌套不要超过两层，再深的归属改用查询参数。

## 代码示例

一个「文章收藏」模块的 API 设计，先写契约再写代码：

```text
GET    /api/articles?tag=css&page=1    列表（分页/过滤）
POST   /api/articles                   新建文章
GET    /api/articles/42                文章详情
PATCH  /api/articles/42                修改文章
DELETE /api/articles/42                删除文章
PUT    /api/articles/42/favorite       收藏（幂等：重复收藏结果一致）
DELETE /api/articles/42/favorite       取消收藏
```

对应的响应约定：

```json
{
  "data": [{ "id": 42, "title": "…" }],
  "page": { "current": 1, "size": 20, "total": 137 }
}
```

错误响应同样结构化：状态码 + 机器可读的错误码 + 人类可读的 message——前端才能据此决定「重试还是提示用户」。

## 常见坑

1. **坑 1：GET 带副作用**。用 `GET /api/like?id=42` 做点赞——预取、爬虫、浏览器刷新都会触发 GET。改数据的动作必须用 POST/PUT/DELETE。
2. **坑 2：URL 里塞动词**。`/getUserById` 是把 RPC 习惯带进了 REST；资源 + 方法 + 状态码三件套才是 REST 的表达方式。
3. **坑 3：所有错误都返回 200**。返回 200 + body 里写 `"success": false`，前端和监控系统都无法按状态码分流。让状态码回归本位。

## 小练习

1. 为「待办清单」设计一套 REST API：列表、新建、改状态、删除、按日期过滤。
2. 指出 `GET /api/clearCart` 违反了哪两条约定并改正。
3. 思考题：为什么 `PUT` 要求幂等，而 `POST` 不要求？这影响哪种网络重试场景？
