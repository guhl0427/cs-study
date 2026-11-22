---
id: l-os-process-thread
slug: process-thread
title: 进程与线程：程序的两种并发单元
difficulty: 2
estMinutes: 45
tags: [操作系统, 进程]
summary: 进程是分配资源的独立小屋，线程是屋里共享家当的工人——分清这两层，服务崩溃、内存暴涨才有排查的坐标。
updated: 2026-11-22
resources:
  - id: r-ostep-process
    title: OSTEP 第 4 章：进程的抽象
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf
    type: doc
    difficulty: 2
    note: 经典教材的进程章节，免费 PDF，把进程状态机讲透。
  - id: r-ostep-book
    title: 《操作系统导论》（OSTEP 中文版）
    url: https://book.douban.com/subject/33326040/
    type: book
    difficulty: 2
    note: 操作系统入门第一推荐教材，语言友好，配套习题齐全。
  - id: r-os-fork-man
    title: fork(2) 手册页
    url: https://man7.org/linux/man-pages/man2/fork.2.html
    type: doc
    difficulty: 3
    note: 想看 fork 真面目时的第一手资料。
---

> 一句话定义：进程是**操作系统分配资源的最小单位**（独立地址空间），线程是**调度的最小单位**（共享进程内存）——程序并发跑起来，靠的就是这两层结构。

## 概念讲解

类比合租房：**进程是一套独立的房子**，门锁、家具（内存、文件句柄）归这套房独享；**线程是屋里分头干活的室友**，共用同一套家具，各带一个记事本（寄存器、栈）。操作系统用 **PCB**（进程控制块）给每个进程建档——存 PID、状态、寄存器快照；线程切换时保存/恢复寄存器上下文，是同一套思路。

CPU 核心就几个，程序却几十个，「同时运行」的错觉来自快速切换。进程一生在三种状态间流转：

```text
┌────────┐  被调度器选中    ┌────────┐
│  就绪  │ ──────────────→ │  运行  │
│        │ ←────────────── │        │
└────────┘ 时间片用完/抢占 └────────┘
    ↑         等待 IO / 锁     ↓
    └─── IO 完成/事件到 ──→ 阻塞
```

关键直觉：**阻塞时不占 CPU**——等服务端响应的线程不是在烧 CPU，是在排队。进程与线程的取舍，一张表看懂：

| 维度 | 进程 | 线程 |
| ---- | ---- | ---- |
| 分到什么 | 独立地址空间 + 资源 | 只分到 CPU 时间 |
| 共享什么 | 几乎什么都不共享 | 共享进程内存与 fd |
| 崩溃影响 | 只死自己 | 一个崩，全进程陪葬 |
| 创建/切换成本 | 高（要建整套地址空间） | 低（换寄存器即可） |
| 通信方式 | 管道、socket（贵但隔离好） | 直接读写共享变量（快但易竞态） |

创建的直觉：Unix 的 `fork()` 把当前进程「复印一份」，父子各跑各的、互不亏欠；创建线程只是「在同一屋里多叫一个工人」，便宜得多。所以后端服务常**多进程部署保隔离，进程内多线程提并发**：一个 worker 崩了单独重启，其余照常服务。

两个排错术语顺带记下：**孤儿进程**——父进程先死，子进程被 init 收养，无害；**僵尸进程**——子进程已退出但父进程没「收尸」（没读取退出状态），会一直占着进程表项，看到就要处理。

## 代码示例

用 Python 一段代码对比「进程隔离」与「线程共享」：

```python
import multiprocessing as mp
import threading

counter = 0
def child_process():
    global counter
    counter = 100            # 改的是子进程自己那份「复印件」

def child_thread():
    global counter
    counter = 100            # 改的就是主进程里的变量本体

if __name__ == "__main__":
    p = mp.Process(target=child_process)
    p.start(); p.join()
    print("进程实验后 counter =", counter)   # 0 —— 子进程的修改没传回来

    t = threading.Thread(target=child_thread)
    t.start(); t.join()
    print("线程实验后 counter =", counter)   # 100 —— 线程共享内存
```

再用系统命令看真实的进程与状态：

```bash
ps -eo pid,ppid,stat,cmd | head -10
# STAT 列：R=运行/就绪，S=睡眠（阻塞中），Z=僵尸
# 典型结果：S 的进程远多于 R——大多数进程都在阻塞等 IO，这才是常态
# Windows 等价：tasklist /v，或任务管理器的「详细信息」页
```

## 常见坑

1. **坑 1：以为线程崩溃只死线程自己**。线程没有独立地址空间，一个线程段错误或致命异常，整个进程一起退出。排查思路：崩溃日志分析的是「进程死因」，别只盯着出事的线程。
2. **坑 2：以为子进程的修改能传回父进程**。进程各有独立地址空间，子进程改变量只是改自己的副本。要传结果，得走返回值、管道或队列（`mp.Queue`）。
3. **坑 3：僵尸进程堆积**。`ps` 里一排 `<defunct>`：子进程退出了，父进程一直不回收。排查：先找父进程，让它调用 wait 回收，或干脆重启父进程。
4. **坑 4：无节制多开进程**。每进程一套地址空间，内存占用直接 ×N。服务「开 500 个进程然后 OOM」，多半就是这么来的。

## 小练习

1. 跑上面的进程/线程实验，解释两次输出为什么差 100。
2. 用 `ps -eo pid,ppid,stat,cmd` 找一个 S（睡眠）进程，根据 cmd 猜猜它在等什么。
3. 思考题：Nginx 用多进程、许多 Java 服务用多线程，各自的取舍是什么？（提示：隔离性 vs 共享成本）
