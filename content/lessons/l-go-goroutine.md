---
id: l-go-goroutine
slug: go-goroutine
title: goroutine 与 channel：Go 的并发模型
difficulty: 2
estMinutes: 45
tags: [Go, 并发]
summary: goroutine 是 KB 级的轻量协程，go 一个关键字就能开几十万个；channel 用「传数据」代替「抢内存」，这就是 Go 的并发哲学。
updated: 2026-11-22
resources:
  - id: r-go-waza
    title: Go 官方博客 · Concurrency is not parallelism
    url: https://go.dev/blog/waza-talk
    type: doc
    difficulty: 3
    note: Rob Pike 的经典演讲整理，讲清「并发是设计、并行是执行」。
  - id: r-go-waitgroup
    title: sync 包官方文档 · WaitGroup
    url: https://pkg.go.dev/sync#WaitGroup
    type: doc
    difficulty: 2
    note: Add/Done/Wait 三个方法的权威用法与注意事项。
---

> 一句话定义：goroutine 是 Go 运行时托管的轻量「线程」，channel 是协程之间传数据的管道——一个负责并发执行，一个负责安全交接数据。

## 概念讲解

操作系统线程很重：栈要 MB 级内存，切换要内核参与，开几千个就吃不消。goroutine 是**Go 运行时自己调度的「逻辑线程」**：栈起步只有 2KB、可增可缩，调度发生在用户态——像食堂窗口开多了排不过来，而传菜机器人成本极低、随叫随到，一个进程开几十万个 goroutine 都不稀奇。

开协程只要一个 `go` 关键字：`go doWork()`，立即返回、doWork 在后台跑。但有个反直觉的点：**main 不等协程**——main 一返回整个进程就结束，没跑完的协程直接陪葬。所以要用 `sync.WaitGroup` 收尾：

```go
var wg sync.WaitGroup
wg.Add(1)        // 计数 +1（开几个协程加几次）
go func() {
	defer wg.Done() // 跑完 -1；用 defer 保证一定执行
	// ... 干活
}()
wg.Wait()        // 阻塞到计数归零
```

Go 的并发哲学是一句名言：**不要通过共享内存来通信，而要通过通信来共享内存**——别让协程抢同一个变量（加锁容易错），把数据通过 channel 传过去，同一时刻数据只有一个主人。channel 像传送带：`ch := make(chan int)` 无缓冲，发送会卡到有人接收、一收一发同步交接；`make(chan int, 5)` 带缓冲，能先囤 5 个，满了发送才阻塞。发送是 `ch <- 42`，接收是 `v := <-ch`。

select 则是给多个 channel 装的**分线器**：哪个 case 就绪走哪个，都没就绪就卡住，常配 `time.After` 做超时：

```go
select {
case v := <-ch1:                fmt.Println("ch1 来了:", v)
case v := <-ch2:                fmt.Println("ch2 来了:", v)
case <-time.After(time.Second): fmt.Println("等了 1 秒，超时")
}
```

## 代码示例

生产者消费者小示例——生产者协程通过缓冲 channel 传数据，WaitGroup 收尾：

```go
package main

import (
	"fmt"
	"sync"
)

// 生产者：chan<- 表示只能往 channel 发送
func producer(ch chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	for i := 1; i <= 3; i++ {
		ch <- i * i // 发送 1、4、9；缓冲满时阻塞等消费者取走
	}
	close(ch) // 关闭传送带：告诉接收方「没有新数据了」
}

func main() {
	ch := make(chan int, 2) // 容量 2 的缓冲 channel
	var wg sync.WaitGroup
	wg.Add(1)
	go producer(ch, &wg) // go 一键开协程，立即返回

	for v := range ch { // 主协程当消费者；收完自动退出循环
		fmt.Println("收到:", v)
	}
	wg.Wait()
}
```

运行结果（发送/接收一一对应，顺序固定）：

```text
收到: 1
收到: 4
收到: 9
```

## 常见坑

1. **坑 1：开完协程 main 就退了**。现象：`go work()` 之后什么都不打印。原因：main 不等协程，进程直接结束。排查：上 WaitGroup（Add 与 Done 严格成对），或用 channel 接收把 main 阻塞住。
2. **坑 2：无缓冲 channel 两端互等死锁**。现象：`fatal error: all goroutines are asleep - deadlock!`。原因：无缓冲 channel 的发送要卡到有人接收为止，若发送和接收写在**同一个**协程里先后执行，发送永远等不到接收者。排查：检查每条 channel 的发送方与接收方是否分属不同协程。
3. **坑 3：往已关闭的 channel 发送**。现象：`panic: send on closed channel`。原因：close 之后只许收不许发。排查：约定「谁生产谁关闭」，接收方永远不要 close；接收用 `v, ok := <-ch` 判断是否已关。
4. **坑 4：循环变量捕获**。Go 1.22 之前，`for i := range xs` 里 `go func(){ 用 i }()` 的多个协程可能全拿到最后一个 i。排查：升级到 1.22+（语言已修复），旧版本在循环体首行写 `i := i` 复制一份。

## 小练习

1. 把示例改成 3 个生产者 + 2 个消费者：用两个 WaitGroup 分别等两组，跑几次观察输出顺序不稳定——想想为什么缓冲 channel 下顺序会变。
2. 故意写一个「先 close 再发送」的程序看 panic；再改成接收方用 `v, ok := <-ch` 判断关闭后正常退出。
3. 思考题：两个协程各自给同一个 int 自增 100 万次，不加任何同步会得到什么？分别用互斥锁和 channel 各写一个正确方案，比较哪个读起来更顺。
