---
id: l-go-gin
slug: go-gin
title: Gin：写出第一个 Web 服务
difficulty: 2
estMinutes: 40
tags: [Go, Web]
summary: Gin 是 Go 最流行的 Web 框架：路由、参数绑定、JSON、中间件都是现成的，几十行就能起一个可 curl 验证的 HTTP 服务。
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

标准库 `net/http` 能起服务，但路由参数、JSON 绑定、校验都得自己拼。Gin 把这些通用件做成了现成的。依赖管理日常三连（go mod 相当于 npm/pip）：

```bash
go get github.com/gin-gonic/gin  # 拉依赖并写入 go.mod
go mod tidy                      # 补齐缺失、清掉没用（日常收尾用它）
go run main.go                   # 起服务
```

Gin 的心智模型一条流水线：

```text
请求 ──▶ 中间件（Logger/Recovery…一层层过） ──▶ 路由匹配 ──▶ 处理函数
```

三类取参数的方式各管一段：**路径参数**在路由里用冒号声明（`/users/:id`），`c.Param("id")` 取——用于定位一个资源，对应 REST 的 `GET /users/42`；**查询参数**在 `?` 后面（`?page=2`），`c.Query("page")` 取——用于过滤和分页；**请求体**用 `c.ShouldBindJSON(&req)` 把 JSON 自动映射进结构体，字段上的 `binding:"required"` 标签让缺失字段直接校验失败，不用手写 if。

**分组路由** `r.Group("/api")` 把同一前缀的一组路由挂在一起，公共中间件也挂组上。**中间件**本质上就是一个 `func(*gin.Context)`：在处理函数之前执行，`c.Next()` 把控制权交给下一层——日志、鉴权、panic 恢复都是这么一层层包上去的；`gin.Default()` 已经默认接好 Logger（请求日志）和 Recovery（崩溃恢复）两个。

## 代码示例

一个完整可运行的迷你用户服务——`go get` 之后保存为 `main.go`，`go run main.go` 启动：

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type createUserReq struct { // 请求体：JSON 字段 ↔ 结构体字段
	Name string `json:"name" binding:"required"` // 缺 name 直接 400
}

func main() {
	r := gin.Default() // 已接好 Logger（日志）+ Recovery（panic 恢复）中间件
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"}) // gin.H = map[string]any
	})
	api := r.Group("/api") // 分组：以下路由都带 /api 前缀
	{
		api.GET("/users/:id", func(c *gin.Context) {
			// 路径参数 /users/42 → "42"；查询参数 ?page=3，缺省给默认值 "1"
			c.JSON(http.StatusOK, gin.H{"id": c.Param("id"), "page": c.DefaultQuery("page", "1")})
		})
		api.POST("/users", func(c *gin.Context) {
			var req createUserReq
			if err := c.ShouldBindJSON(&req); err != nil { // 绑定 + 校验一步完成
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return // 忘了 return 会带着零值结构体继续往下跑
			}
			c.JSON(http.StatusCreated, gin.H{"created": req.Name})
		})
	}
	r.Run(":8080") // 监听端口，阻塞运行
}
```

curl 验证：

```bash
curl http://localhost:8080/ping                 # {"message":"pong"}
curl http://localhost:8080/api/users/42?page=3  # {"id":"42","page":"3"}
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{"name":"guhl"}'   # → {"created":"guhl"}
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{}'                 # → {"error":"... 'Name' failed on the 'required' tag"}
```

## 常见坑

1. **坑 1：POST 一直返回 400**。原因：`ShouldBindJSON` 按请求头解析 body，curl 没带 `-H "Content-Type: application/json"` 就不是 JSON。排查：curl 补上 Content-Type，浏览器 DevTools 里看请求头。
2. **坑 2：绑定失败后忘记 return**。现象：返回了错误信息还执行了后面的逻辑，甚至对零值结构体做操作。排查：`if err := c.ShouldBindJSON(...); err != nil` 分支里必须 `return`。
3. **坑 3：`c.Query` 拿到空串**。可选参数没传时返回 `""` 而不报错，`strconv.Atoi("")` 会炸。排查：用 `c.DefaultQuery("page", "1")` 给默认值，或手动判空再转换。
4. **坑 4：端口被占用**。现象：`listen tcp :8080: bind: address already in use`。原因：上一个 `go run` 没停。排查：Windows 用 `netstat -ano | findstr 8080` 找到 PID 结束进程，或改 `r.Run(":8081")`。

## 小练习

1. 给服务加 `DELETE /api/users/:id`，返回 `{"deleted": id}`，用 curl 验证。
2. 写一个自己的中间件挂到 `/api` 组上：打印每个请求的路径和耗时（提示：进中间件时 `time.Now()`，`c.Next()` 之后的代码在响应后执行）。
3. 思考题：`GET /users/:id` 传进来的 id 是字符串，本例直接透传了。要不要校验它是数字？参数校验应该放在 handler 里还是中间件里？
