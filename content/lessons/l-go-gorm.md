---
id: l-go-gorm
slug: go-gorm
title: GORM：让 Go 接上数据库
difficulty: 2
estMinutes: 80
tags: [Go, 数据库]
summary: ORM 翻译官心智：模型标签、AutoMigrate、CRUD 四板斧与易混点、? 占位防注入、事务直觉——主线把 Gin 课程的内存存储完整迁移到 GORM+SQLite。
updated: 2026-11-22
resources:
  - id: r-gorm-docs
    title: GORM 官方文档（中文）
    url: https://gorm.io/zh_CN/docs/
    type: doc
    difficulty: 2
    note: 连接、模型定义、CRUD 的权威手册，有完整中文版。
  - id: r-sqlite-browser
    title: DB Browser for SQLite
    url: https://sqlitebrowser.org/
    type: tool
    difficulty: 1
    note: 图形界面打开 .db 文件，亲眼看看 AutoMigrate 建出了什么表。
---

> 一句话定义：GORM 是 Go 最流行的 ORM——struct 就是表、字段就是列，你写方法调用，它替你拼出安全正确的 SQL。

## 概念讲解

### ORM 是「翻译官」：对象世界 ↔ 表世界

Go struct 和数据库表是两套语言：一边是 User{ID, Name, Email}，一边是 users 表的行列。不用 ORM 就得手写 SQL 字符串、再把扫出的行一列列塞回 struct，字段一多必乱。GORM 站在中间当**翻译官**：模型是带标签的 struct，你调方法，它翻成方言正确的 SQL，查询结果再反向填回 struct。

```text
     Go 世界                            数据库世界
┌───────────────────┐             ┌────────────────────────┐
│ User{ID:1,        │             │ users 表                │
│  Name:"guhl",     │  ◀─翻译─▶   │ id | name | email      │
│  Email:"g@x.com"} │             │ 1  | guhl | g@x.com    │
└───────────────────┘             └────────────────────────┘
db.Create(&u)            ──▶ INSERT INTO users (name,email) VALUES (?,?)
db.First(&u, 1)          ──▶ SELECT * FROM users WHERE id = 1 LIMIT 1
db.Where("age > ?", 18)  ──▶ SELECT * FROM users WHERE age > 18
```

### 连接：gorm.Open + DSN，换数据库只改一行

```go
db, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{})  // SQLite：一个文件即一座库
db, err := gorm.Open(mysql.Open("user:pass@tcp(127.0.0.1:3306)/app?charset=utf8mb4&parseTime=true"), &gorm.Config{}) // MySQL
```

SQLite 免安装免服务，最适合练手；换 MySQL 只改 `Open` 里的驱动和 DSN（连接串），其余代码一行不动——这就是翻译官屏蔽方言的价值。练手时用 DB Browser for SQLite 打开 app.db，能亲眼看到 AutoMigrate 建出的表。

### 模型：struct 标签决定翻译规则

```go
type User struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"size:64;not null" json:"name"`
	Email string `gorm:"uniqueIndex" json:"email"`
}
```

| gorm 标签 | 翻译成 | 作用 |
| ---- | ---- | ---- |
| primaryKey / autoIncrement | PRIMARY KEY / 自增 | 自增主键标配 |
| size:64 | varchar(64) | 列长度 |
| uniqueIndex | UNIQUE 索引 | 唯一性交给数据库把关（如邮箱查重） |
| not null | NOT NULL | 非空约束 |

命名约定：驼峰字段名译成蛇形列（`CreatedAt` → 列 `created_at`），CreatedAt/UpdatedAt 自动填时间。**建表不用手写 DDL**：`db.AutoMigrate(&User{})` 按 struct 建表；表已存在就只补缺的列——改完模型重跑一次即可。

### CRUD 四板斧与两个易混点

| 操作 | 写法 | 翻译与行为 |
| ---- | ---- | ---- |
| 增 | db.Create(&u) | INSERT，自增 ID 回填 u.ID |
| 查一条 | db.First(&u, 1) | 按主键查，查不到返回 ErrRecordNotFound |
| 查多条 | db.Where("age > ?", 18).Find(&us) | 条件查询，查不到只是空切片 |
| 改 | db.Model(&u).Updates(...) | 只 UPDATE 指定字段 |
| 删 | db.Delete(&u, 1) | DELETE ... WHERE 主键 = 1 |

两个易混点：**First vs Find**——First 的语义是「必须有一条」，查不到是错误；Find 的语义是「取一批」，没有结果只是空切片。**Updates vs Save**——Updates 传 struct 会**跳过零值字段**（Age=0 被当成「没填」，想写零值要用 `map[string]any` 或 `Select("age")` 点名）；Save 是全字段覆盖（含零值），整行替换才用它。

### Where 与 ? 占位：安全是底线

条件里的值一律走占位符：`db.Where("name = ?", name)`。参数由驱动单独转义传输，用户输入永远只是「值」，变不成 SQL 代码——这正是防 SQL 注入的关键（呼应安全课）。`Where("name = '" + name + "'")` 这类拼接是事故起点，绝不手写。

### 关联与事务：一句直觉

**belongs to（属于）**：文章属于作者——Article 里放外键 `AuthorID uint` 加字段 `Author User`，查询时 `Preload("Author")` 一次把作者带出来。**事务**：`db.Transaction(func(tx *gorm.DB) error { ... })`——闭包里返回 error 整体回滚、返回 nil 自动提交，「先扣钱再加钱」要么都成要么都不成，不用手动 Begin/Commit。

### 与 SQLAlchemy / MyBatis 对照

| 能力 | SQLAlchemy（Python） | MyBatis（Java） | GORM |
| ---- | ---- | ---- | ---- |
| 模型定义 | class + Column | XML/注解手写 SQL | struct + 标签 |
| 查询 | 方法链 query.filter() | 手写 SQL 为主 | 方法链 Where().Find() |
| 建表 | Base.metadata.create_all | 手写 DDL | AutoMigrate |
| 风格 | 全自动 ORM | 半自动、SQL 可控 | 全自动 + db.Raw 兜底原生 SQL |

Windows 下注意：官方 SQLite 驱动依赖 CGO，编译报 gcc 错误的处理见常见坑——纯 Go 替代驱动一行导入就能换。

## 代码示例

主线任务：**把 Gin 课程的内存存储换成 GORM + SQLite**——同样的五个端点，数据落盘、重启不丢。迁移步骤先行，再上完整代码。

### 第 0 步：装依赖

```bash
go get gorm.io/gorm gorm.io/driver/sqlite
go mod tidy
```

### 第 1 步：从内存版到 GORM 版的迁移清单

1. 删掉 userStore 结构体和互斥锁——并发安全交给数据库（SQLite 自带写锁）；
2. 启动时 `gorm.Open` 打开 users.db + `AutoMigrate` 建表；
3. 五个 handler 里的「锁 + map 操作」逐个换成 db.Create / First / Find / Updates / Delete；
4. 行为升级：重启服务数据还在；邮箱唯一索引让「重复注册」在数据库层就被拦下。（Windows 编译若报 CGO/gcc 错误，把驱动导入换成纯 Go 的 `github.com/glebarez/sqlite`，见常见坑 4。）

### 第 2 步：完整程序 main.go

```go
package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite" // CGO 报错就换 "github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// User 同时是 GORM 模型（gorm 标签）和 HTTP 请求/响应体（json + binding 标签）
type User struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"size:64;not null" json:"name" binding:"required"`
	Email string `gorm:"uniqueIndex" json:"email" binding:"omitempty,email"`
}

func main() {
	db, err := gorm.Open(sqlite.Open("users.db"), &gorm.Config{}) // 文件即数据库
	if err != nil {
		panic(err)
	}
	db.AutoMigrate(&User{}) // 按 struct 建表；已存在只补缺的列
	r := gin.Default()
	api := r.Group("/api")
	{
		api.POST("/users", func(c *gin.Context) { // 增
			var req User
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			if err := db.Create(&req).Error; err != nil { // INSERT，唯一索引冲突在这暴露
				c.JSON(http.StatusConflict, gin.H{"error": "邮箱可能已重复"})
				return
			}
			c.JSON(http.StatusCreated, req) // 自增 ID 已回填 req.ID
		})
		api.GET("/users", func(c *gin.Context) { // 列表 + 可选过滤
			var users []User
			q := db.Order("id")
			if name := c.Query("name"); name != "" {
				q = q.Where("name LIKE ?", "%"+name+"%") // ? 占位防注入
			}
			q.Find(&users) // 查不到也只是空切片，不是错误
			c.JSON(http.StatusOK, users)
		})
		api.GET("/users/:id", func(c *gin.Context) { // 单查
			id, ok := parseID(c)
			if !ok {
				return
			}
			var u User
			err := db.First(&u, id).Error // 按主键查一条
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusOK, u)
		})
		api.PUT("/users/:id", func(c *gin.Context) { // 改
			id, ok := parseID(c)
			if !ok {
				return
			}
			var req User
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res := db.Model(&User{}).Where("id = ?", id).Updates(map[string]any{"name": req.Name, "email": req.Email}) // map 形式不跳过零值，只改列出的字段
			if res.Error != nil {
				c.JSON(http.StatusConflict, gin.H{"error": "邮箱可能已重复"})
				return
			}
			if res.RowsAffected == 0 { // 没匹配到行 = 用户不存在
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			req.ID = uint(id)
			c.JSON(http.StatusOK, req)
		})
		api.DELETE("/users/:id", func(c *gin.Context) { // 删
			id, ok := parseID(c)
			if !ok {
				return
			}
			res := db.Delete(&User{}, id) // 按主键删
			if res.RowsAffected == 0 {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"deleted": id})
		})
	}
	r.Run(":8080")
}

func parseID(c *gin.Context) (int, bool) { // 与上一课相同：路径参数转正整数，失败已写好 400
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id 必须是正整数"})
		return 0, false
	}
	return id, true
}
```
### 第 3 步：curl 验证与「重启不丢」

```bash
go run main.go
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{"name":"guhl","email":"guhl@example.com"}'   # → 201 {"id":1,...}；重复同邮箱 → 409
curl "http://localhost:8080/api/users?name=gu"         # → LIKE 过滤：[{"id":1,...}]
curl http://localhost:8080/api/users/999               # → 404（First 查不到）
curl -X DELETE http://localhost:8080/api/users/1       # → {"deleted":1}
# 关键验证：Ctrl+C 停服后重新 go run main.go，数据还在（内存版做不到）；唯一索引冲突走 409——查重已搬进数据库，DB Browser 打开 users.db 可见 UNIQUE 索引
```

## 常见坑

1. **坑 1：First 查不到直接报错**。现象：`record not found`。原因：First 按主键查，查不到返回 `gorm.ErrRecordNotFound`。排查：用 `errors.Is(err, gorm.ErrRecordNotFound)` 单独处理这个正常分支转 404；Find 查不到只是空切片。
2. **坑 2：Updates 跳过零值字段**。现象：`Updates(User{Age: 0})` 后 age 没改成 0。原因：struct 形式用「是否为零值」判断字段有没有填。排查：用 `map[string]any` 或 `Select("age").Updates(...)` 显式点名；整行替换才用 Save。
3. **坑 3：拼接 SQL 字符串**。现象：`Where("name = '" + name + "'")` 是注入漏洞。排查：一律占位符 `Where("name = ?", name)`，让驱动安全转义。
4. **坑 4：Windows 下编译驱动报 CGO 错误**。现象：`cgo: C compiler "gcc" not found`。原因：官方 sqlite 驱动依赖 CGO。排查：装 MinGW gcc，或换纯 Go 驱动 `github.com/glebarez/sqlite`（只改导入路径，API 相同）。
5. **坑 5：忘跑 AutoMigrate**。现象：`no such table: users`；或加了新字段后查询报列不存在。原因：表没建或 struct 改了没同步。排查：启动时 AutoMigrate 是幂等的，重跑一次就补齐列。
6. **坑 6：Create 后不看 .Error**。现象：唯一索引冲突被当成功，响应里的 ID 还是 0。原因：GORM 不抛异常，错误都在 `.Error` 字段里。排查：每次写操作都 `if err := db...Error; err != nil`，冲突分支返回 409。

## 小练习

1. 给 User 加 `Age int` 字段，重跑 AutoMigrate，用 DB Browser 确认新列出现；再 curl POST 带 age 验证 JSON 响应多了字段。
2. 写两个查询版本对比行为：一个用 `First(&u, id)`，一个用 `Where("id = ?", id).Find(&us)`，curl 验证「查不到」时前者 404、后者 200 空数组。
3. 用 `db.Transaction` 实现「交换两个用户的名字」：回调里先改 A 再故意 return error，curl/DB Browser 验证库里两人的名字都没变——体会整体回滚。
4. **综合任务**：加 Article belongs to User——`Article{ID, Title, AuthorID, Author User}`，AutoMigrate 两个模型，POST /api/articles 建文章，GET /api/articles 用 `Preload("Author")` 返回带作者的文章列表。
