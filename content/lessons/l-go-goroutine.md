---
id: l-go-goroutine
slug: go-goroutine
title: goroutine 与 channel：Go 的并发模型
difficulty: 2
estMinutes: 85
tags: [Go, 并发]
summary: 线程与 goroutine 成本对照、WaitGroup 三方法配对纪律、channel 阻塞语义与单向类型、select 超时、死锁现场推演——主线是并发抓取 10 个模拟任务并汇总结果。
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
  - id: r-gobyexample
    title: Go by Example · Goroutines 与 Channels
    url: https://gobyexample.com/goroutines
    type: doc
    difficulty: 1
    note: 可直接运行的小例子集，channel/select 每个模式一页看懂。
---

> 一句话定义：goroutine 是 Go 运行时托管的轻量「线程」，channel 是协程之间安全交接数据的管道——一个负责并发执行，一个负责传数据。

## 概念讲解

### 线程很贵，goroutine 很便宜

操作系统线程像食堂的**正式员工**：一人一间独立更衣室（MB 级栈内存）、上下班交接要走行政流程（内核态切换），雇几十个成本就压不住了。goroutine 是 **Go 运行时自雇的传菜机器人**：出厂只要 2KB 栈、可增可缩，调度在用户态完成（不进内核），一个进程开几十万个都稀松平常。

| 成本项 | OS 线程 | goroutine |
| ---- | ---- | ---- |
| 初始栈 | 1–8 MB，固定预留 | 2 KB，按需增缩 |
| 创建/销毁 | 内核参与，微秒级起 | 用户态，纳秒级 |
| 切换成本 | 陷入内核，保存全套上下文 | 用户态协作式切换，极轻 |
| 合理数量级 | 数千 | 数十万 |

```text
 goroutine 世界（用户态，便宜）           OS 世界（贵）
 G1 G2 G3 G4 G5 G6 ... G100000
     \  |  /        \  |  /
   Go 调度器：把大量 G 轮流塞进少量线程
          |              |
        线程 M1        线程 M2    ← 真正占 CPU 的只有这几个
```

### go 关键字与「main 不等协程」

`go doWork()` 立即返回，doWork 在后台跑。反直觉的铁律：**main 不等协程**——main 一返回整个进程立刻结束，没跑完的协程直接陪葬。所以并发程序必须有收尾手段，最常用 sync.WaitGroup：

```go
var wg sync.WaitGroup
wg.Add(1)        // 计数 +1：开几个协程加几次
go func() {
	defer wg.Done() // 计数 -1：用 defer 保证必然执行
	// ... 干活
}()
wg.Wait()        // 阻塞到计数归零才放行
```

三方法配对纪律：**Add 在 go 之前调用、Done 用 defer 挂协程开头、Wait 放 main 收尾**。Add(3) 却只有两个 Done？计数永远到不了 0，Wait 卡死到运行时报 deadlock。

### channel：用「传数据」代替「抢内存」

Go 并发哲学是 Rob Pike 的名言：**不要通过共享内存来通信，而要通过通信来共享内存**。别让协程抢同一个变量（锁极易写错），把数据用 channel 传过去——同一时刻数据只有一个主人，交接即所有权转移。channel 像工厂传送带：

```text
生产者 goroutine ──▶  ch ──▶  消费者 goroutine
    ch <- 42      [ 传送带 ]      v := <-ch
        发送 ────▶        ────▶ 接收
```

语义核心是**什么时候阻塞**，一张表说清：

| channel | 发送阻塞条件 | 接收阻塞条件 |
| ---- | ---- | ---- |
| 无缓冲 make(chan T) | 直到有人**正在**接收 | 直到有人**正在**发送 |
| 有缓冲 make(chan T, n) | 直到缓冲区满 | 直到缓冲区空 |

无缓冲是「面对面交接」：两边都到位才算完成；有缓冲是「货架」：放得下就走人。`close(ch)` 宣布「没有新数据了」，接收方 `for v := range ch` 收完自动退出，`v, ok := <-ch` 用 ok 判断是否已关。纪律：**谁生产谁关闭**，接收方永远不要 close。

### 单向 channel：把方向写进类型里

参数可以声明 channel 只收或只发：`tasks <-chan string`（只读）、`results chan<- int`（只写）。编译器替你把关——worker 想往只读 channel 发送直接编译失败。这是「用类型表达设计意图」，谁生产谁消费一眼看清。

### select：一个协程守多个 channel

select 是多路分线器：哪个 case 就绪走哪个；多个同时就绪随机挑一个（防饿死）；都没就绪就卡住。配 time.After 做超时是并发程序的标准防御：

```go
select {
case v := <-ch:
	fmt.Println("收到:", v)
case <-time.After(2 * time.Second):
	fmt.Println("2 秒没等到，超时放弃")
}
```

### 死锁现场推演：fatal error: all goroutines are asleep - deadlock!

**场景一：无缓冲 channel 两端互等**。`ch := make(chan int)` 后在同一协程先 `ch <- 1` 再 `<-ch`：发送要卡到「有人正在接收」，而接收语句在下一行、还没执行到——发送永久卡死，运行时判定全员沉睡，报 deadlock。修法：发送与接收分属不同协程，或改用缓冲 channel。

**场景二：忘记 close**。消费者 `for v := range tasks` 等「关闭信号」退出循环，生产者干完活却没 close——range 永远等下一条；若再无别的协程在干活，同样全员沉睡。修法：生产者 defer close(ch)。

排查口诀：见到 deadlock 只需回答一个问题——**每个阻塞的协程，都在等谁？**把等待链画出来，缺的那一环就是要补的 Done / close / 接收方。

## 代码示例

主线任务：**并发抓取 10 个「模拟任务」并汇总结果**——这就是经典的生产者—消费者模型：生产者协程往 tasks channel 投任务，3 个 worker 协程并发消费，结果再经 results channel 汇总。goroutine + channel + WaitGroup + close 全家桶一次到位。

### 完整程序 main.go

```go
package main

import (
	"errors"
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// result 是协程间交接的数据：哪个任务、结果是内容还是错误
type result struct {
	taskID string
	value  string
	err    error
}

// fetch 模拟一次网络抓取：耗时随机，10% 概率失败
func fetch(taskID string) (string, error) {
	time.Sleep(time.Duration(50+rand.Intn(150)) * time.Millisecond) // 模拟网络延迟
	if rand.Intn(10) == 0 {
		return "", errors.New("模拟网络错误")
	}
	return fmt.Sprintf("内容[%s]", taskID), nil
}

// worker 只读任务、只写结果——单向 channel 把方向写进签名
func worker(tasks <-chan string, results chan<- result, wg *sync.WaitGroup) {
	defer wg.Done() // 与 main 里的 Add 严格配对
	for taskID := range tasks { // tasks 关闭后循环自动退出
		v, err := fetch(taskID)
		results <- result{taskID, v, err} // 缓冲=任务数，发送永不阻塞
	}
}

func main() {
	taskIDs := []string{"t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"}

	tasks := make(chan string)                 // 无缓冲：领任务面对面交接
	results := make(chan result, len(taskIDs)) // 缓冲=任务数：worker 发完即走
	var wg sync.WaitGroup

	const numWorkers = 3
	wg.Add(numWorkers) // Add 在 go 之前，一次加够
	for i := 0; i < numWorkers; i++ {
		go worker(tasks, results, &wg)
	}

	// 生产者单独开协程：投完 defer close，worker 的 range 才能退出
	go func() {
		defer close(tasks)
		for _, id := range taskIDs {
			tasks <- id
		}
	}()

	wg.Wait()      // 等所有 worker 干完（Done 计数归零）
	close(results) // 此时再关结果 channel，下面的 range 才有终点

	failed := 0
	for r := range results { // 把缓冲里囤的结果全部取出
		if r.err != nil {
			failed++
			fmt.Printf("[%s] 失败: %v\n", r.taskID, r.err)
		} else {
			fmt.Printf("[%s] 成功: %s\n", r.taskID, r.value)
		}
	}
	fmt.Printf("共 %d 个任务，失败 %d 个\n", len(taskIDs), failed)
}
```

### 运行与验证

```bash
go mod init example.com/fetchall
go run .
```

一次可能的输出（**每次的顺序与成败都可能不同——这本身就是并发**）：

```text
[t3] 成功: 内容[t3]
[t1] 失败: 模拟网络错误
[t7] 成功: 内容[t7]
...
共 10 个任务，失败 1 个
```

输出说明了什么：任务 10 个、worker 只有 3 个，总耗时约为单个任务均耗时的 10/3 倍而不是 10 倍——**并发把等待时间重叠了**；失败任务不拖垮别人，错误作为 result 的一个字段被安全送回统一统计——「错误也是数据」。

动手验证死锁：把 results 的缓冲改成 `make(chan result)`（无缓冲）再跑——worker 的发送卡住时主协程还在 wg.Wait() 无人接收，运行时直接报 all goroutines are asleep。**亲手改一次，死锁推演就刻进脑子了。**

## 常见坑

1. **坑 1：开完协程 main 就退了**。现象：`go work()` 之后什么都不打印就退出。原因：main 不等协程，进程随 main 结束。排查：上 WaitGroup（Add 在 go 前、Done 用 defer），或用 channel 接收把 main 阻塞住。
2. **坑 2：Add 写进了协程内部**。现象：Wait 偶尔提前放行，结果时有时无。原因：Add 与 Wait 并发执行，Wait 可能在 Add 之前发现计数为 0。排查：Add 必须在 `go` 语句之前调用，Done 用 defer 保证执行。
3. **坑 3：往已关闭的 channel 发送**。现象：`panic: send on closed channel`。原因：close 之后只许收不许发。排查：约定「谁生产谁关闭」，接收方永远不 close；接收用 `v, ok := <-ch` 判断是否已关。
4. **坑 4：忘记 close 导致 range 卡死**。现象：`for v := range ch` 永不结束，最后报 deadlock。原因：range 要等到 channel 关闭才知道「没有更多了」。排查：检查生产者是否 defer close；临时可用 `v, ok := <-ch` 的 ok 分支调试。
5. **坑 5：循环变量捕获**。现象（Go 1.22 之前）：`for i := range xs { go func(){ 用 i }() }` 的多个协程全拿到最后一个 i。排查：升级 1.22+（语言已修复）；旧版本在循环体首行写 `i := i` 复制一份。
6. **坑 6：缓冲 channel 当无限队列用**。现象：内存持续上涨，消费者越落越远。原因：容量只是削峰不是无限，生产长期快于消费时终会阻塞或堆积。排查：给生产端加超时/丢弃策略（select + time.After），或限制在途任务数。

## 小练习

1. 把示例改成 3 个生产者 + 2 个消费者：用两个 WaitGroup 分别等两组，多跑几次观察输出顺序不稳定——想想为什么缓冲 channel 下顺序会变。
2. 给汇总阶段加总超时：用 select 包住「从 results 取结果」与 `time.After(5*time.Second)`，超时就报告「收集超时」退出——练概念讲解里的分线器模式。
3. 故意写一个「close 后再发送」的程序观察 panic；再把接收端改成 `v, ok := <-ch`，验证 ok 为 false 后正常退出。
4. **综合任务**：给 fetch 加单任务超时——fetch 内部把结果发进一个无缓冲小 channel，外层用 select 包住「收结果」与 `time.After(2*time.Second)`，超时算失败。最终输出里应出现「失败: 超时」。
