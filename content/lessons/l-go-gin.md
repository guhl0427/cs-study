---
id: l-go-gin
slug: go-gin
title: Gin：写出第一个 Web 服务
difficulty: 2
estMinutes: 80
tags: [Go, Web]
summary: Gin 全景：依赖三连与包缓存位置、请求流水线与中间件洋葱模型、三类参数对照、ShouldBindJSON 校验行为——主线是 5 端点用户 CRUD 服务加 6 步 curl 全验证。
updated: 2026-11-22
resources:
  - id: r-gin-docs
    title: Gin Web Framework 官方文档
    url: https://gin-gonic.com/docs/
    type: doc
    difficulty: 2
    note: 快速上手、路由、绑定与中间件的官方手册。
  - id: r-gin-examples
    title: Gin 官方示例集（GitHub）
    url: https://github.com/gin-gonic/gin/tree/master/examples
    type: doc
    difficulty: 2
    note: 按功能分文件的官方示例，缺什么查什么。
---

> 一句话定义：Gin 是 Go 生态最流行的 Web 框架——路由、参数、JSON、中间件都替你备好，你只写「收到什么请求、返回什么响应」。

## 概念讲解

### Gin 是什么：把 Web 服务的通用件一次配齐

标准库 net/http 能起服务，但路由参数、JSON 绑定、参数校验、panic 恢复全要自己拼。Gin 是 Go 生态最流行的 Web 框架，心智上等于 **Flask 的极简路由 + Pydantic 的声明式校验 + 一套现成中间件**，性能还在最快的那一档。你只写「收到什么请求、返回什么响应」，其余通用件框架备好。

### go mod 依赖三连：get / tidy / 下载到哪

```bash
go get github.com/gin-gonic/gin   # ① 拉依赖并写进 go.mod（= pip install 同时更新 requirements.txt）
go mod tidy                       # ② 补齐缺失、清掉未用（日常收尾用它）
go run main.go                    # ③ 起服务
```

依赖包**不下载进项目目录**：统一缓存在用户目录的 `GOPATH/pkg/mod`（Windows 默认 `C:\Users\你\go\pkg\mod`），项目里只有 go.mod（依赖清单）和 go.sum（校验和）两个文件——Go 项目没有 node_modules 那样的巨型文件夹。

### 请求处理流水线：一个请求走过的路

```text
请求 ──▶ Logger ──▶ Recovery ──▶ 路由匹配 ──▶ 处理函数 ──▶ c.JSON 响应
  ▲                                                              │
  └───────── 响应原路穿回：c.Next() 之后的代码在这里执行 ◀─────────┘
```

中间件本质是 `func(*gin.Context)`：在处理函数**之前**执行，调 `c.Next()` 把控制权交给下一层；`c.Next()` 之后的代码在响应完成后继续执行——像洋葱，进和出各干各的事。`gin.Default()` 已默认挂好 Logger（每个请求一行日志）和 Recovery（handler panic 被兜住转 500，服务不崩）；`gin.New()` 是裸的，中间件自己挂。

### 三类取参数：各管一段，别混

| 来源 | URL 例子 | 取法 | 用途 |
| ---- | ---- | ---- | ---- |
| 路径参数 | /api/users/42 | c.Param("id") | 定位一个资源，路由用 :id 声明 |
| 查询参数 | /api/users?page=2 | c.Query("page") / c.DefaultQuery("page", "1") | 过滤、分页，不参与路由匹配 |
| 请求体 | POST 的 JSON | c.ShouldBindJSON(&req) | 提交数据 |

注意 `c.Param` 拿到的永远是**字符串**：转数字要 `strconv.Atoi`，失败要当 400 处理——主线里专门写了 parseID 助手。

### JSON 绑定：解析与校验一步完成

```go
type createUserReq struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"omitempty,email"`
}
```

`c.ShouldBindJSON(&req)` 按请求头的 Content-Type 选解析器，把 body 反序列化进 struct，**同时按 binding 标签校验**：required 字段缺失、email 格式不对都会让 err 非 nil——据此回 400 并 return。omitempty 表示「没填才跳过校验」。手写 if 判空的活，标签声明全接管。

### 响应 JSON 的两种写法

```go
c.JSON(http.StatusOK, gin.H{"message": "pong"}) // 写法一：gin.H 就是 map[string]any，随手拼字段
c.JSON(http.StatusOK, user)                     // 写法二：直接给 struct，按 json 标签序列化
```

临时响应、错误信息用 gin.H；正式数据模型用 struct——字段名与嵌套结构有据可查。状态码用常量：http.StatusOK=200、StatusCreated=201、StatusNotFound=404，不写魔法数字。

### 与 FastAPI / Flask 对照

| 能力 | FastAPI / Flask | Gin |
| ---- | ---- | ---- |
| 路由 | @app.get("/users/{id}") | r.GET("/users/:id", handler) |
| 路径参数 | 函数参数声明类型，自动转换 | c.Param("id")，手转类型 |
| 请求体校验 | Pydantic 模型 | struct + binding 标签 |
| JSON 响应 | return dict 自动序列化 | c.JSON(code, obj) |
| 中间件 | @app.middleware / before_request | r.Use(func(*gin.Context)) |
| 并发模型 | 单进程事件循环 / 多 worker 进程 | 每请求一个 goroutine，天然并发 |

## 代码示例

主线任务：**完整的用户 CRUD 服务**（内存存储）——列表、单查、新建、更新、删除五个端点全配齐，用 curl 验证每个端点的正常与错误分支。上一课的并发知识立刻用上：Gin 给每个请求开独立 goroutine，内存 map 必须加互斥锁。

### 完整程序 main.go

```go
package main

import (
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"
)

// User 请求体与响应体共用：json 标签管字段名，binding 标签管校验
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"omitempty,email"`
}

type userStore struct {
	mu     sync.Mutex // Gin 每请求一个 goroutine，共享 map 必须加锁——上一课的竞态知识
	users  map[int]User
	nextID int
}

func main() {
	store := &userStore{users: make(map[int]User), nextID: 1}
	r := gin.Default()     // 已挂 Logger（请求日志）+ Recovery（panic 兜底转 500）
	api := r.Group("/api") // 分组：以下路由都带 /api 前缀
	{
		api.GET("/users", func(c *gin.Context) { // ① 列表
			store.mu.Lock()
			out := make([]User, 0, len(store.users))
			for _, u := range store.users {
				out = append(out, u)
			}
			store.mu.Unlock()
			c.JSON(http.StatusOK, out) // map 遍历无序，顺序不保证
		})
		api.POST("/users", func(c *gin.Context) { // ② 新建
			var req User
			if err := c.ShouldBindJSON(&req); err != nil { // 绑定+校验一步完成
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return // 忘了 return 会拿着零值结构体继续往下跑
			}
			store.mu.Lock()
			req.ID = store.nextID
			store.nextID++
			store.users[req.ID] = req
			store.mu.Unlock()
			c.JSON(http.StatusCreated, req) // 201
		})
		api.GET("/users/:id", func(c *gin.Context) { // ③ 单查
			id, ok := parseID(c)
			if !ok {
				return // parseID 失败时已写好 400 响应
			}
			store.mu.Lock()
			u, found := store.users[id]
			store.mu.Unlock()
			if !found {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusOK, u)
		})
		api.PUT("/users/:id", func(c *gin.Context) { // ④ 更新
			id, ok := parseID(c)
			if !ok {
				return
			}
			var req User
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			store.mu.Lock()
			old, found := store.users[id]
			if found {
				old.Name, old.Email = req.Name, req.Email
				store.users[id] = old
			}
			store.mu.Unlock()
			if !found {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			req.ID = id
			c.JSON(http.StatusOK, req)
		})
		api.DELETE("/users/:id", func(c *gin.Context) { // ⑤ 删除
			id, ok := parseID(c)
			if !ok {
				return
			}
			store.mu.Lock()
			_, found := store.users[id]
			if found {
				delete(store.users, id)
			}
			store.mu.Unlock()
			if !found {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"deleted": id})
		})
	}

	r.Run(":8080") // 监听 :8080，阻塞运行
}

func parseID(c *gin.Context) (int, bool) { // 路径参数转正整数；失败已写好 400
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 必须是正整数"})
		return 0, false
	}
	return id, true
}
```
### curl 验证：6 步走完全部端点与错误分支

```bash
go mod init example.com/ginusers && go get github.com/gin-gonic/gin && go mod tidy
go run main.go
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{"name":"guhl","email":"guhl@example.com"}'  # ① → 201 {"id":1,...}
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{}'                                          # ② → 400 required 校验失败
curl http://localhost:8080/api/users                    # ③ → 200 [{"id":1,...}]
curl http://localhost:8080/api/users/1                  # ④ → 200；把 1 换成 999 → 404，换成 abc → 400
curl -X PUT http://localhost:8080/api/users/1 -H "Content-Type: application/json" -d '{"name":"guhl2","email":"guhl2@example.com"}'  # ⑤ → 200
curl -X DELETE http://localhost:8080/api/users/1        # ⑥ → 200 {"deleted":1}；再查同一 id → 404
```

输出说明了什么：400 是「请求不合法」（缺字段）、404 是「请求合法但资源不存在」、201 是「新建成功」——REST 状态码语义在实际响应里对上了号；②的错误信息直接来自 required 校验器，生产环境可再包一层友好文案。

## 常见坑

1. **坑 1：POST 一直返回 400**。现象：同样的代码 curl 能过、前端发就 400。原因：`ShouldBindJSON` 按请求头解析 body，漏了 `Content-Type: application/json` 就不是 JSON。排查：F12 或 `curl -v` 对比请求头。
2. **坑 2：绑定失败后忘记 return**。现象：返回了错误信息还执行了后面的逻辑，甚至对零值结构体做操作。排查：`if err := c.ShouldBindJSON(...); err != nil` 分支里必须 `return`。
3. **坑 3：`c.Query` 拿到空串**。现象：`strconv.Atoi("")` 报错，接口 500。原因：可选查询参数没传时返回 `""` 而不报错。排查：用 `c.DefaultQuery("page", "1")` 给默认值，或手动判空再转换。
4. **坑 4：/users/abc 返回 404 而不是 400**。现象：非数字 id 被当成 0 去查，最后落到「用户不存在」。原因：Param 是字符串，没做转换校验。排查：统一走 parseID，转换失败立即 400，别把格式错混进 404。
5. **坑 5：端口被占用**。现象：`listen tcp :8080: bind: address already in use`。原因：上一个 `go run` 没停。排查：Windows 用 `netstat -ano | findstr 8080` 找到 PID 结束进程，或改 `r.Run(":8081")`。
6. **坑 6：压测时偶发 `fatal error: concurrent map writes`**。现象：并发一高服务直接崩。原因：handler 里的共享 map 没加锁，多 goroutine 同时写。排查：`go run -race` 跑一遍抓竞态，用 sync.Mutex 保护。

## 小练习

1. 给服务加过滤查询 `GET /api/users?name=xx`（c.Query + 锁内筛选），用 curl 验证命中与不命中两种输出。
2. 写一个耗时中间件挂到 /api 组：进中间件记 `time.Now()`，`c.Next()` 之后打印路径和耗时。
3. 把 Email 的 binding 改成 `required,email`，用 curl 分别测「缺 email」和「错格式 email」，观察两条错误信息的差别。
4. **综合任务**：实现「按 email 查重」——创建时若 email 已存在返回 409 Conflict；用 curl 验证重复创建的响应。（提示：锁内查重，别在锁外写 map。）
