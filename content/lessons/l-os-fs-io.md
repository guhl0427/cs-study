---
id: l-os-fs-io
slug: fs-io
title: 文件系统与 I/O：数据怎么落盘
difficulty: 2
estMinutes: 35
tags: [操作系统, 文件系统]
summary: 文件是一串字节加一份 inode 履历，fd 是进程攥着文件的把手——句柄泄漏、掉电丢数据，根子都在这节。
updated: 2026-11-22
resources:
  - id: r-ostep-file
    title: OSTEP 文件与 I/O 章节
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf
    type: doc
    difficulty: 2
    note: inode、fd、目录实现的经典讲解。
  - id: r-fsync-man
    title: fsync(2) 手册页
    url: https://man7.org/linux/man-pages/man2/fsync.2.html
    type: doc
    difficulty: 3
    note: 「write 成功不等于落盘」的官方出处。
---

> 一句话定义：文件 = 一串字节 + 一份 inode 元数据；进程用**文件描述符（fd）**操作文件——句柄泄漏、掉电丢数据、日志半截这三大线上事故，都能追到这里。

## 概念讲解

磁盘上没有「文件名」，只有 **inode**：每个文件一份档案，记录大小、权限、时间戳、数据块在哪些扇区。你熟悉的目录树只是**索引**：目录本身也是个文件，内容是一张「文件名 → inode 号」的对照表。所以层级是查表入口不是真实容器——同一份内容可以挂两个名字（硬链接），改名、移动都只是改表，不搬数据。

Unix 哲学「**一切皆文件**」：普通文件、目录、管道、终端、socket，全用同一套 open/read/write/close 接口。`/dev` 下的设备、`/proc` 下的进程信息都是这个哲学的产物——工具不用为每种对象学一套新 API。

进程每 open 一个文件，就领到一个小整数 **fd**（文件描述符）：0/1/2 固定是标准输入/输出/错误，之后从 3 递增。fd 指向内核的**打开文件表**条目（记录打开方式、当前偏移），条目背后才是 inode：

```text
进程 A：fd 3 ──→ 打开文件表条目「读模式，偏移 100」
进程 B：fd 3 ──→ 打开文件表条目「读模式，偏移 0」（偏移各管各的）
                        打开文件表条目 ──→ inode：大小/权限/数据块位置
```

fd 是进程攥着文件的「把手」，把手数量有限（默认上限常为 1024），忘了 close 就是泄漏。最后是「落盘」的真相：`write()` 返回成功，只代表数据进了内核的**页缓存**（内存），磁盘可能还没动；攒一批统一刷盘是性能的关键，但**掉电时缓冲里的数据就没了**。要「落袋为安」得调 `fsync` 逼内核真正写盘——数据库每笔事务必 fsync，就是它的底气。（日志型文件系统一句带过：先写操作日志再改数据，掉电后靠日志恢复一致性。）阻塞/非阻塞 I/O 一句话版：read 没数据就干等叫**阻塞**，立刻返回「没数据」叫**非阻塞**——后者是 select/epoll 高并发模型的接口基石，网络课再展开。

## 代码示例

复现 fd 泄漏——只开不关，看它崩给你看：

```python
import os
handles = []
try:
    for i in range(5000):
        handles.append(open("test.txt", "w"))   # 反复打开同一个文件，只开不关
except OSError as e:
    print(f"开到第 {len(handles)+1} 个就崩了：{e}")
    # 运行结果：开到 1020 个左右报错
    # [Errno 24] Too many open files —— fd 是有限资源
finally:
    for h in handles:
        h.close()                               # 收拾干净
```

验证缓冲的存在——写入后「偷偷看」文件里有没有：

```python
f = open("buf.txt", "w")
f.write("hello")                # 这 5 个字节大概率还躺在缓冲区里
print(open("buf.txt").read())   # 运行结果：多半是空字符串！
f.flush()                       # 交给内核（仍只是页缓存，掉电仍会丢）
print(open("buf.txt").read())   # 现在有 hello 了
f.close()
# 掉电级别的安全要 os.fsync(f.fileno())：把页缓存真正压到磁盘
```

观察真实进程的 fd（Linux）：

```bash
ls /proc/$$/fd | wc -l        # 当前 shell 攥着几个 fd（通常个位数）
lsof -p <pid> | wc -l         # 任何进程的 fd 清单；服务 fd 只涨不跌就是泄漏
```

## 常见坑

1. **坑 1：句柄泄漏（fd 泄漏）**。现象：服务跑几天报 `Too many open files`、新连接建不起来；`lsof -p <pid>` 里 fd 只涨不跌。原因：异常路径忘了 close——文件、socket、数据库连接都占 fd。修复：用 `with` 或 try/finally 保证关闭。
2. **坑 2：以为 write 返回就万事大吉**。数据只在页缓存，掉电即丢。关键数据（订单、事务日志）必须 fsync；普通日志可以攒批换性能。
3. **坑 3：崩溃后日志只剩前半截**。写一半进程崩了，缓冲区里那段没了。排查：关键点显式 flush，或把日志框架设为立即刷盘。
4. **坑 4：把目录当「真实容器」**。目录只是索引表，inode 的链接数归零才真正释放数据块——删文件快、恢复难都源于此。

## 小练习

1. 跑 fd 泄漏实验；再用 `ls /proc/$$/fd | wc -l` 数数当前 shell 的 fd，解释为什么这么少。
2. 跑缓冲实验，把 flush 一行注释掉再跑一次，比较输出并解释原因。
3. 思考题：为什么数据库每条事务都 fsync（慢也要做），普通应用日志却攒一批再写（快就好）？
