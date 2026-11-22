---
id: l-go-syntax
slug: go-syntax
title: Go 语法速览：为并发而生的语言
difficulty: 2
estMinutes: 40
tags: [Go, 入门]
summary: Go 把工程友好做到极致：关键字少、编译快、并发内置、发布就是扔一个二进制文件——与 Python/C 的差异一文看全。
updated: 2026-11-22
resources:
  - id: r-go-tour
    title: A Tour of Go（官方交互教程）
    url: https://go.dev/tour/
    type: doc
    difficulty: 1
    note: 官方入门教程，在网页里逐节改代码运行，覆盖本文全部语法点。
  - id: r-gopl
    title: 《The Go Programming Language》
    url: https://www.gopl.io/
    type: book
    difficulty: 3
    note: 公认最系统的 Go 入门书，学完本文后的进阶首选。
---

> 一句话定义：Go 是为大规模后端而生的编译型语言——语法精简、编译飞快、并发内置，部署就是扔一个二进制文件。

## 概念讲解

Go 的设计哲学一句话：**把语言做简单，把工程做好做**。Google 2009 年造它，就是受够了 C++ 的编译慢和并发难写。它砍掉了类继承、异常、三元运算符，每件事只留一条路；`gofmt` 一键统一全社区代码风格，连括号放哪都没有争议。另一大卖点在部署：`go build` 产出的可执行文件**自带运行时**，服务器上不用装任何解释器，拷过去就能跑。

**开工第一步**是建模块（Go 1.21+ 用 go mod 管依赖，相当于 pip + requirements.txt）：

```bash
mkdir hello && cd hello
go mod init example.com/hello   # 生成 go.mod：记录模块名与依赖（相当于 package.json）
go run main.go                  # 编译并直接运行；go build 产出可执行文件，部署=拷走它
```

每个文件首行声明包，可执行程序必须有 `package main` 和入口 `func main()`。

变量两条路：`var name = "guhl"`（完整写法，类型可省）和 `name := "guhl"`（**短声明**，只能在函数内用，自动推断类型——日常九成用它）。基本类型 `int`/`float64`/`bool`/`string` 够用了。`if` 不写括号但必须有大括号；**循环只有 `for` 一个关键字**，`for cond {}` 就是 while。函数支持**多返回值**，这是 Go 错误处理的地基：`v, err := divide(10, 0)`。容器就两个：切片 `slice`（动态数组）和 `map`（键值对），都能用 `range` 遍历。`defer` 让语句在函数返回前才执行（关文件、关连接的标配），先记住名字即可。

和已学语言的差异一览：

| 特性 | Python | C | Go |
| ---- | ------ | - | -- |
| 类型 | 动态推断 | 必须声明 | 静态 + `:=` 推断 |
| 循环 | for / while | for / while | 只有 for |
| 错误 | 异常 try/except | 返回值约定 | 多返回值 + error |
| 并发 | GIL 伪并发 | 手写线程 | goroutine 内置 |

**错误处理的直觉**：Go 没有异常，错误是普通返回值，调用方必须当面检查。没出错时返回 `nil`，出错时用 `fmt.Errorf("查用户 %d 失败: %w", id, err)` 构造错误值——`%w` 把底层错误包装进链条，类似异常里的 cause。之后 `errors.Is(err, os.ErrNotExist)` 会沿着包装链判断「是不是某类错」，像 instanceof，但所有出错路径都摆在代码里，一眼看全。

## 代码示例

`go mod init` 后保存为 `main.go`，`go run main.go` 即可运行，输出如下：

```go
package main

import (
	"errors"
	"fmt"
)

func divide(a, b int) (int, error) { // 多返回值：结果 + 错误——Go 错误处理核心模式
	if b == 0 {
		return 0, errors.New("除数不能为 0") // 出错时结果给零值
	}
	return a / b, nil // nil 表示「没错」
}

func main() {
	scores := []int{92, 87, 95}              // 切片：动态数组
	user := map[string]int{"id": 7, "lv": 3} // map：键值对

	for i, s := range scores { // range 同时给出下标和值
		fmt.Printf("第 %d 科: %d\n", i, s)
	}
	fmt.Println("user[id] =", user["id"]) // map 按键取值

	if v, err := divide(10, 0); err != nil { // if 可以带初始化语句
		fmt.Println("出错了:", err)
	} else {
		fmt.Println("结果:", v)
	}
}
```

```text
第 0 科: 92
第 1 科: 87
第 2 科: 95
user[id] = 7
出错了: 除数不能为 0
```

## 常见坑

1. **坑 1：`:=` 与 `=` 用混**。报错 `no new variables on left side of :=`——`:=` 是「声明并赋值」，左边必须至少有一个**新**变量；给旧变量赋值用 `=`。
2. **坑 2：定义了变量没用、导入了包没用**。Python 只警告，Go 直接编译失败。排查：删掉，或用 `_` 接收不关心的返回值——语言强迫你保持代码干净。
3. **坑 3：nil 的 map 写入 panic**。`var m map[string]int` 只声明没分配，直接 `m["a"] = 1` 崩溃。排查：用 `make(map[string]int)` 创建后再写；读 nil map 反而安全，返回零值。
4. **坑 4：err 拿了不判空**。错误被静默吞掉，程序在几百行后以莫名其妙的方式崩。排查：见到 error 返回值就写 `if err != nil` 分支，别空转。

## 小练习

1. 把示例里的 `range` 改写成 `for i := 0; i < len(scores); i++` 版本，体会 `range` 帮你省了什么。
2. 写 `func max(vals ...int) (int, error)`：可变参数求最大值，空参数返回错误；在 main 里调用并检查这个 error。
3. 思考题：Go 把异常换成「错误值」，你觉得是变啰嗦了还是变清晰了？想想 try 块包住 50 行代码时，你还分得清哪行会抛错吗？
