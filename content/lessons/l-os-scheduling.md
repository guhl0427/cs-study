---
id: l-os-scheduling
slug: scheduling
title: 调度与并发问题：CPU 时间怎么分
difficulty: 2
estMinutes: 40
tags: [操作系统, 并发]
summary: 调度器把 CPU 时间切成时间片轮着发——理解了切换与竞态，多线程「偶现计数不对、偶现卡死」才有根因解释。
updated: 2026-11-22
resources:
  - id: r-ostep-sched
    title: OSTEP 调度章节
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf
    type: doc
    difficulty: 2
    note: 经典教材讲调度策略的免费章节，配大量习题。
  - id: r-py-threading
    title: Python 官方文档：threading
    url: https://docs.python.org/3/library/threading.html
    type: doc
    difficulty: 2
    note: Lock 与 with 用法的权威出处，做本节实验必备。
---

> 一句话定义：调度器是 CPU 时间的**时间片分配员**——几十个进程抢几个核，靠高速切换制造「并行」错觉；切换点会切开「读-改-写」，这正是并发事故的总根因。

## 概念讲解

单核 CPU 一次只能执行一个程序，你却能同时听歌、聊天、编译——全靠调度器每隔几毫秒**切换**一次：把 A 的寄存器存回 PCB，装入 B 的寄存器接着跑。这个动作叫**上下文切换**，本身是纯开销（微秒级，还可能冲垮 CPU 缓存），切太勤 CPU 在「换人」上空转，切太慢系统又卡顿。所以策略都在权衡：**时间片轮转**（人人有份轮流上）、**优先级调度**（重要的先上，交互任务优先）。

并发三大问题的根因都藏在切换里。以 `counter += 1` 为例，它不是一步，而是三步：**读内存 → 加 1 → 写回**，线程可以在任意两步之间被切走：

```text
线程 A：读 5 →（+1=6）→          →写 6
线程 B：        读 5 →（+1=6）→ 写 6    ← 两次 +1，结果只加了 1！
```

这就是**竞态条件**，这次「丢失更新」让计数悄悄变少。三大问题里：竞态最常见（数据悄悄错）、**死锁**最致命（互相持锁等待彻底卡死）、**饥饿**最隐蔽（低优先级永远排不上队）。

死锁的经典类比：两个银行家各攥着一笔贷款不放，又都等着对方先放款才能成交——四个人、四把锁同理。教科书总结死锁需要**四个条件同时成立**（互斥、持有并等待、不可抢占、循环等待），实操记一条就够：**打破循环等待——所有线程按固定顺序申请锁**。

怎么救竞态？给「读-改-写」整体上一把**互斥锁**（mutex）：谁拿到锁谁做完三步，别人在门口排队。锁是用串行化换正确性，所以锁内代码要尽量短——别把网络请求塞进锁里。

为什么这是后端必修课？服务端天然多线程/多协程，计数错、缓存脏、偶现卡死这类「跑一万次才出一次」的 bug，几乎都是竞态或死锁。看不懂调度，就只能靠重启玄学。

## 代码示例

先看竞态现场——两个线程不加锁同时加计数（多跑几次，结果每次都不一样）：

```python
import threading

counter = 0

def add_100k():
    global counter
    for _ in range(100_000):
        counter += 1          # 读→改→写，中途可能被切走

t1 = threading.Thread(target=add_100k)
t2 = threading.Thread(target=add_100k)
t1.start(); t2.start()
t1.join();  t2.join()
print(counter)                # 期望 200000，实际约 11 万~17 万，每次跑都不同
```

加互斥锁后，同一个程序立刻稳定正确：

```python
import threading

counter = 0
lock = threading.Lock()

def add_100k():
    global counter
    for _ in range(100_000):
        with lock:            # with 块结束自动释放，防止忘记 unlock
            counter += 1

t1 = threading.Thread(target=add_100k)
t2 = threading.Thread(target=add_100k)
t1.start(); t2.start()
t1.join();  t2.join()
print(counter)                # 200000，跑一百次也是它（但会明显变慢）
```

最后看机器层面每秒切换多少次：

```bash
vmstat 1                      # Linux：盯 cs 列（每秒上下文切换次数）
# 典型输出里 cs 高达几千到几十万——「并行」其实是高速轮转
# Windows 等价：任务管理器 → 性能 → CPU；或用 Process Explorer 看切换数
```

## 常见坑

1. **坑 1：以为 `x += 1`、`dict[k] = v` 是原子的**。它们都是「读-改-写」多步操作，中途可被切走。排查：结果偶现偏小、数据偶现错乱，先找无锁共享变量。
2. **坑 2：锁内做慢操作**。锁里调接口、写盘，等于让所有线程排队等 IO。排查：多线程吞吐反而低于单线程，先看锁的持有范围。
3. **坑 3：加锁顺序不一致导致死锁**。A 先锁 1 再锁 2、B 先锁 2 再锁 1，概率性互相卡死。排查：线程转储看两个线程各自的持锁状态；修复：全局固定加锁顺序。
4. **坑 4：手动 acquire 后忘记 release**。异常一抛锁就永远不还，后续全部卡死。用 `with lock:` 让语言代管释放。

## 小练习

1. 把无锁实验的循环改成 1000 次，多跑几次——丢失更新还明显吗？想想为什么数据量小时「看起来没事」。
2. 写两个线程：一个先 lock1 后 lock2，另一个先 lock2 后 lock1，复现死锁（卡住后 Ctrl+C），再改成固定顺序修复。
3. 思考题：单核 CPU 上也会出现竞态吗？（提示：切换可以发生在任意两条指令之间。）
