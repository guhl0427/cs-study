---
id: l-swe-api-debug
slug: api-debug
title: 接口调试与 API 文档
difficulty: 1
estMinutes: 30
tags: [API, 调试]
summary: 联调一半时间在调接口——请求四要素、状态码速查、三步排查法，外加 curl 和 Postman 两把刷子。
updated: 2026-11-22
resources:
  - id: r-http-status-mdn
    title: MDN · HTTP 状态码
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status
    type: doc
    difficulty: 1
    note: 状态码权威参考，本节速查表出自这里。
  - id: r-curl-book
    title: Everything curl
    url: https://everything.curl.dev/
    type: doc
    difficulty: 2
    note: curl 官方书，当字典查参数。
  - id: r-postman-learning
    title: Postman Learning Center
    url: https://learning.postman.com/
    type: doc
    difficulty: 1
    note: collections、环境变量等核心功能的官方教程。
---

> 一句话定义：调接口 = 把一个 HTTP 请求拼对并看清响应——method、path、header、body 四要素齐了，问题就锁定了一大半。

## 概念讲解

前后端联调，一半时间耗在「接口怎么不工作」上。这时别盯代码搞玄学，先把请求四要素过一遍：

| 要素 | 内容 | 常见错误 |
| ---- | ---- | ---- |
| method | GET / POST / PUT / DELETE | 改数据的动作误用了 GET |
| path | /api/articles/42 | 拼错、漏版本号、单复数错 |
| header | Content-Type、Authorization | POST 忘了 JSON 类型、token 没带 |
| body | 请求携带的数据 | 字段名/类型和文档对不上 |

状态码速查表（背下来，排查快一半）：

| 状态码 | 含义 | 排查方向 |
| ---- | ---- | ---- |
| 200 / 201 | 成功 / 已创建 | —— |
| 400 | 参数错误 | 自己：body 和文档对不上 |
| 401 | 未认证（没登录或 token 失效） | 自己：header 没带 token |
| 403 | 已登录但没权限 | 找后端确认权限配置 |
| 404 | 路径不存在 | 自己：path 拼错了 |
| 500 | 服务器内部错误 | 找后端查日志 |

**OpenAPI/Swagger**：把接口写成机器可读的契约文档（路径、参数、响应结构），通常还带在线试调页面。「文档即契约」——前后端照同一份约定开发，争论时以文档为准，改约定先改文档再改代码。

Postman/Apifox 这类客户端的价值：请求存成 **collections** 反复复用；用**环境变量**一键切换开发/测试域名，token 存变量里不用每次粘贴。

## 代码示例

用 curl 发一个四要素齐全的请求（新建文章）：

```bash
curl -X POST https://api.example.com/v1/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -d '{"title": "第一篇", "content": "hello"}'
```

-X 是 method，path 跟在域名后，-H 加 header，-d 是 body。预期响应：

```text
HTTP/1.1 201 Created
{ "id": 42, "title": "第一篇" }
```

排查三步法，演示「返回 401」时怎么走：

```text
1. 看状态码  → 401：身份问题，不是参数问题
2. 看响应体  → { "message": "token expired" }：token 过期了
3. 核对请求  → header 里带的是旧 token → 换新 token 重试
```

顺序不能乱：状态码定方向，响应体拿细节，最后核对请求本身——跳步就容易查错方向。

## 常见坑

1. **坑 1：状态码 200 但业务失败**。有的接口永远返 200，错误码藏在 body（`"code": 1001`）。对策：先看响应体里的业务码，别见 200 就当成功。
2. **坑 2：POST 忘写 `Content-Type: application/json`**。服务端按表单解析，body 字段全部丢失，返回 400「参数缺失」。对策：curl 用 `-d` 时记得带这个 header；Postman/Apifox 选 JSON 会自动加。
3. **坑 3：401 和 403 混为一谈**。401 是「你是谁我还没确认」，403 是「我知道你是谁，但你没权限」。混着报会误导排查方向。

## 小练习

1. 用 curl 对公开接口发 GET（如 `curl https://api.github.com/users/octocat`），读懂响应头里的状态行和 Content-Type。
2. 把一次 401 场景完整走一遍三步排查法，写下每一步的结论。
3. 思考题：为什么「文档即契约」能减少前后端扯皮？如果代码和文档打架，该先改哪个？
