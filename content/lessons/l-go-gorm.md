---
id: l-go-gorm
slug: go-gorm
title: GORM：让 Go 接上数据库
difficulty: 2
estMinutes: 40
tags: [Go, 数据库]
summary: GORM 把 struct 翻译成表和 SQL：AutoMigrate 建表、方法调用做 CRUD，占位符防注入，事务收敛成一个回调函数。
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

> 一句话定义：GORM 是 Go 最流行的 ORM——struct 就是表、字段就是列，你写方法调用，它替你拼 SQL。

## 概念讲解

不用 ORM 时，你得手写 SQL 字符串，再把扫出来的行一列列塞进结构体，字段一多就乱。GORM 是「对象 ↔ 表」的**翻译官**：模型就是一个带标签的 struct，建表和 CRUD 都是方法调用：

```text
User{ID, Name, Age}   ◀── struct 即表 ──▶   users 表 (id, name, age)
db.Create(&u)          ──GORM 翻译──▶   INSERT INTO users (name, age) VALUES (...)
db.Where("age > ?", 18).Find(&us) ──▶  SELECT * FROM users WHERE age > 18
```

**连接**一行搞定：`db, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{})`——SQLite 文件即数据库、免装服务，最适合练手。换 MySQL 只改驱动和 DSN：`mysql.Open("user:pass@tcp(127.0.0.1:3306)/app?charset=utf8mb4&parseTime=true")`，其余代码一行不动，这就是 ORM 屏蔽方言的价值。

**模型**就是 struct，`gorm:"..."` 标签控制翻译规则：`ID uint` 加 `gorm:"primaryKey"` 是自增主键，`Email string` 加 `gorm:"uniqueIndex"` 建唯一索引；`CreatedAt` 这类约定字段会自动填充时间，驼峰名默认译成蛇形列（`CreatedAt` → 列 `created_at`）。建表不用手写 DDL，`db.AutoMigrate(&User{})` 按 struct 建表，表已存在就只补缺的列。

**CRUD 四板斧**：`db.Create(&u)` 增、`db.First(&u, 1)` 按主键查一条、`db.Where("age > ?", 18).Find(&users)` 条件查多条、`db.Model(&u).Updates(...)` 改、`db.Delete(&u)` 删。注意 `?` 占位符——**绝不用字符串拼接传值**，参数交给驱动转义，SQL 注入就进不来。一句话对照：GORM ≈ Python 的 SQLAlchemy（模型即表、方法拼查询）；Java 的 MyBatis 则反过来偏手写 SQL 映射——GORM 收走样板代码，需要原生 SQL 时还有 `db.Raw` 兜底。

**关联**一句带过：文章属于作者（belongs to），就在 `Article` 里放外键 `AuthorID uint` 加字段 `Author User`，查询时 `Preload("Author")` 一次把作者带出来。**事务**也收成了回调：`db.Transaction(func(tx *gorm.DB) error { ... })`——闭包里返回 error 整体回滚、返回 nil 自动提交，转账式「要么都成要么都不成」不再需要手动 Begin/Commit。

## 代码示例

建表 + CRUD 完整示例。`go get gorm.io/gorm` 和 `go get gorm.io/driver/sqlite` 后保存为 `main.go` 直接运行（app.db 是文件，重复运行会累积数据）：

```go
package main

import (
	"fmt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct { // struct 即 users 表；字段即列，驼峰名译成蛇形列
	ID   uint   `gorm:"primaryKey"` // 主键，自动自增
	Name string `gorm:"size:64"`
	Age  int
}

func main() {
	db, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{}) // 连接：文件即数据库
	if err != nil {
		panic(err)
	}
	db.AutoMigrate(&User{}) // 按 struct 建表；已存在则只补缺的列

	u := User{Name: "guhl", Age: 18}
	db.Create(&u)                  // INSERT，自增 ID 回填到 u.ID
	fmt.Println("新用户 ID:", u.ID) // 新用户 ID: 1

	var adults []User
	db.Where("age > ?", 10).Find(&adults) // SELECT ... WHERE age > 10（? 占位防注入）
	fmt.Println(len(adults), "个成年人")    // 1 个成年人

	db.Model(&u).Update("age", 20) // UPDATE users SET age=20 WHERE id=1
	db.Delete(&u)                  // DELETE FROM users WHERE id=1
}
```

运行结果（首次运行；app.db 里已有数据时人数会涨）：

```text
新用户 ID: 1
1 个成年人
```

## 常见坑

1. **坑 1：`First` 查不到直接报错**。现象：`record not found`。原因：`First` 按主键查，查不到返回 `gorm.ErrRecordNotFound`。排查：用 `errors.Is(err, gorm.ErrRecordNotFound)` 单独处理「没查到」这个正常分支，`Find` 则查不到只是返回空切片。
2. **坑 2：拼接 SQL 字符串**。`Where("name = '" + name + "'")` 是注入漏洞。排查：一律用占位符 `Where("name = ?", name)`，让驱动安全转义。
3. **坑 3：零值不更新**。`Updates(User{Age: 0})` 会跳过零值字段，age 改回 0 不生效。排查：用 `map[string]any{"age": 0}` 或 `Select("age").Updates(...)` 显式指定要改的字段。
4. **坑 4：Windows 下编译驱动报 CGO 错误**。现象：`cgo: C compiler "gcc" not found` 之类。原因：官方 sqlite 驱动依赖 CGO。排查：装 MinGW gcc，或换纯 Go 驱动 `github.com/glebarez/sqlite`（导入路径替换即可）。

## 小练习

1. 给 User 加 `Email string` 字段（带 `gorm:"uniqueIndex"` 标签），跑一次 AutoMigrate，再用 DB Browser 打开 app.db 看新列出现没有。
2. 实现「删除 18 岁以下用户」：先 `Where` + `Find` 打印将删的人，再 Delete，验证两次结果一致；想想为什么要先查后删。
3. 思考题：转账「先扣 A 的钱、再加 B 的钱」，不用事务时中间断机会怎样？`db.Transaction` 的回调返回 error 时，GORM 靠什么机制保证两步同生共死？
