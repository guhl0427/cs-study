---
id: l-os-fs-io
slug: fs-io
title: 文件系统与 I/O
difficulty: 2
estMinutes: 70
tags: [操作系统, 文件系统, I/O]
summary: 文件是一串字节加一份 inode 履历，fd 是进程攥着文件的把手——亲手复现 Too many open files、验证 flush 前后文件内容，搞清 write、flush、fsync 三层缓冲与掉电丢数据的边界。
updated: 2026-11-22
resources:
  - id: r-ostep-file
    title: OSTEP 文件与 I/O 章节
    url: https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf
    type: doc
    difficulty: 2
    note: inode、fd、目录实现的经典讲解。
  - id: r-ostep-book
    title: 《操作系统导论》（OSTEP 中文版）
    url: https://book.douban.com/subject/33326040/
    type: book
    difficulty: 2
    note: I/O 与持久性部分的完整教材。
  - id: r-fsync-man
    title: fsync(2) 手册页
    url: https://man7.org/linux/man-pages/man2/fsync.2.html
    type: doc
    difficulty: 3
    note: 「write 成功不等于落盘」的官方出处。
---

> 一句话定义：文件 = 一串字节 + 一份 inode 元数据；进程用**文件描述符（fd）**操作文件——句柄泄漏、掉电丢数据、日志半截三大线上事故，都能追到这里。

## 概念讲解

![一次 write 调用穿越的 I/O 分层](fig:os-fs-io)

### inode：磁盘上的身份证

磁盘上没有「文件名」，只有 **inode**：每个文件一份档案，记录大小、权限、时间戳、数据块在哪些扇区。你熟悉的目录树只是**索引**：目录本身也是个文件，内容是一张「文件名 → inode 号」的对照表。

```text
你看到的目录树                    磁盘上的真相
/home/ming/report.txt  ─┐
/home/ming/todo.txt   ──┤  目录文件的内容只是这样的表：
/etc/hosts             ─┤  ┌────────────┬──────────┐
                       ─┘  │ 文件名      │ inode 号  │
                           │ report.txt │  40231   │──→ inode 40231
                           │ hosts      │  12807   │      （大小/权限/时间戳/
                           └────────────┴──────────┘        数据块位置列表）
```

这张表解释了一串现象：**改名、移动**只是改表里的条目，不搬数据，所以瞬间完成；**硬链接**是同一个 inode 在表里挂两个名字，撕掉一个名字数据还在，inode 的「链接数」归零才真正释放数据块——删文件快、恢复难，都源于此。

### 一切皆文件

Unix 哲学「**一切皆文件**」：普通文件、目录、管道、终端、socket、设备（/dev 下的磁盘、/proc 下的进程信息），全用同一套 open/read/write/close 接口。于是 cat、重定向、管道这套工具不用为每种对象学新 API——这是命令行组合力强的底层原因。

### fd → 打开文件表 → inode：一条完整的链路

进程每 open 一个文件，就领到一个小整数 **fd（文件描述符）**：0/1/2 固定是标准输入/输出/错误，之后从 3 递增。fd 指向内核**打开文件表**的一个条目（记录打开方式、当前偏移），条目背后才是 inode：

```text
进程 A open("hosts", 读) → fd 3 → 打开文件表条目①「读模式，偏移 100」
进程 B open("hosts", 读) → fd 3 → 打开文件表条目②「读模式，偏移 0」
                                    条目① ──┐
                                    条目② ──┴──→ 同一个 inode 12807
```

三个要点：① fd 是**进程私有**的把手——A 进程的 fd 3 和 B 进程的 fd 3 毫无关系；② 「当前读到哪」（偏移）住在打开文件表层——两个进程同时读同一个文件，各读各的互不干扰；③ 真正的文件属性（大小、数据在哪）在 inode 层，所有打开者共享同一份真相。Windows 同样有句柄（HANDLE）与上限，机制同构。

fd 是**有限资源**：上限默认常为 1024（`ulimit -n` 可查），文件、socket、数据库连接全都占 fd——忘了 close 就是泄漏，泄漏满了就报 `Too many open files`。

### 三层对象速查表

| 对象 | 属于谁 | 生命周期 | 存什么 |
| ---- | ---- | ---- | ---- |
| inode | 磁盘（文件系统） | 文件存在它就在，链接数归零才释放 | 大小、权限、时间戳、数据块位置 |
| 打开文件表条目 | 内核 | open 时建立，所有相关 fd 关闭后消失 | 打开方式、当前偏移 |
| fd | 进程 | open 返回、close 归还 | 只是个小整数把手 |

同一份磁盘文件可以被多个进程、多次 open：fd 各自独立，打开文件表条目各管各的偏移，最后都落到同一个 inode——这张三层图是后面所有 I/O 排错的坐标系。

### 缓冲与 fsync：数据的三段旅程

```text
你的程序 write("hello")
   │ ① 用户态缓冲：Python 文件对象先攒在内存里，flush 才交给内核
   ▼
内核页缓存（内存）──────── write() 返回成功只代表到了这里！
   │ ② 内核择机刷盘（writeback）：攒批、合并、延迟写，这是性能的关键
   ▼
磁盘
   ③ fsync(fd)：强制把这一文件的页缓存压到磁盘——落袋为安
```

三个动词分清：**flush** 是把用户态缓冲交给内核（快，但仍可能丢）；**fsync** 是逼内核把数据真正写盘（慢，掉电也不丢）；**close** 只是归还 fd 把手，既不等于 flush 也不等于 fsync。数据库每笔事务必 fsync（先写日志再改数据，即 WAL），就是掉电不丢的底气；普通应用日志攒批再写，用性能换「丢最后几秒」的风险。日志型文件系统同理：先记操作日志再改数据，掉电后靠日志恢复一致性。

### 阻塞 / 非阻塞 I/O 一句话版

read 没数据就**干等**叫**阻塞**；立刻返回「没数据」叫**非阻塞**——非阻塞配合事件通知（select/epoll）才能让一个线程伺候成千上万个连接，这是高并发服务器的接口基石，网络课再展开。

## 代码示例

主线任务：复现 fd 泄漏 → 验证三段旅程的每一站 → 看一看 inode 的实物 → 观察真实进程的 fd。全程约 25 分钟。

### 实验 1：只开不关，复现 Too many open files

```python
# demo_fd_leak.py
handles = []
try:
    for i in range(1, 10_000):
        handles.append(open("test.txt", "w"))   # 反复打开同一个文件，只开不关
except OSError as e:
    print(f"开到第 {len(handles) + 1} 个崩了：{e}")
finally:
    for h in handles:
        h.close()                               # 收拾干净
```

预期输出（Linux）：

```text
开到第 1021 个崩了：[Errno 24] Too many open files: 'test.txt'
```

输出说明了什么：fd 是有限资源——1021 = 上限 1024 减去标准三件套（0/1/2）和 Python 运行时占用的几个。用 `ulimit -n` 能验证上限正好是 1024。Windows 上限不同（几千不等），同样会崩在 `OSError`——把手再多也是有限的。生产含义：服务开着的每个 socket、数据库连接、日志文件都在占 fd，只涨不跌迟早撞墙。

```bash
ulimit -n                  # 1024 —— 与实验结果对上
ls /proc/$$/fd | wc -l     # 当前 shell 自己攥着几个 fd（个位数）
```

### 实验 2：flush 前后，文件里到底有没有

```python
# demo_flush.py
import os

f = open("buf.txt", "w")
f.write("hello")
print("刚 write 完：", repr(open("buf.txt").read()))
print("文件大小：", os.path.getsize("buf.txt"))
f.flush()                          # ①用户态 → 内核页缓存
print("flush 之后：", repr(open("buf.txt").read()))
print("文件大小：", os.path.getsize("buf.txt"))
os.fsync(f.fileno())               # 内核页缓存 → 磁盘（掉电也安全）
f.close()                          # 归还 fd；close ≠ fsync，别指望它兜底
```

预期输出：

```text
刚 write 完： ''          ← 5 个字节还躺在 Python 的用户态缓冲里，磁盘上什么都没有
文件大小： 0
flush 之后： 'hello'      ← 数据进了内核页缓存，别的 open() 能看到了
文件大小： 5
```

输出说明了什么：三段旅程的前两站被亲手验证——write 后数据不在文件里，flush 后才可见。第三站（页缓存 → 磁盘）在实验里「看不见」：掉电才显出差别，它的效果只能靠数据库手册和 fsync(2) 手册页作证。另外注意：这里用「另开一个 open()」偷看，实际生产偷看的是另一个进程——数据一进页缓存，全系统可见。

### 实验 3：inode 的实物观察（跨平台）

```python
# demo_inode.py
import os

open("origin.txt", "w").write("data")
ino1 = os.stat("origin.txt").st_ino          # 身份证号
os.rename("origin.txt", "moved.txt")         # 改名
ino2 = os.stat("moved.txt").st_ino
print("改名前后 inode：", ino1, ino2, "相同吗：", ino1 == ino2)

os.link("moved.txt", "alias.txt")            # 硬链接：同一个 inode 挂第二个名字
print("链接数：", os.stat("moved.txt").st_nlink)          # 2
os.remove("moved.txt")                       # 撕掉一个名字
print("删掉一个名字后：", os.stat("alias.txt").st_nlink)  # 1 —— 数据还活着
print("内容还在吗：", open("alias.txt").read())            # data
```

预期输出（inode 号因机器而异）：

```text
改名前后 inode： 40231 40231 相同吗： True
链接数： 2
删掉一个名字后： 1
内容还在吗： data
```

输出说明了什么：名字只是目录表里的条目，inode 才是文件本体——改名 inode 不变；「删除」删的是名字，链接数归零才真正释放数据块。Linux/macOS 直接成立；Windows NTFS 的 st_ino 是 FileIndex，链接是硬链接（NTFS 原生支持），同样成立。

### 实验 4：观察真实进程的 fd

```bash
ls -l /proc/$$/fd | head -6    # 0/1/2 固定在，后面是临时打开的
lsof -p <pid> | wc -l          # 任何进程的 fd 总数；隔 1 分钟再数一次
# 两次都在涨 → 泄漏嫌疑；涨到接近 ulimit -n → 马上要撞墙
# Windows 等价：(Get-Process -Id <pid>).Handles，或 Process Explorer 的 Handles 列
```

输出说明了什么：0/1/2 的固定席位、「把手数量有限、只开不关迟早耗尽」都能在这里对上实物。给长期运行的服务建一条 fd 数量监控，是句柄泄漏最早期的报警。

## 常见坑

1. **坑 1：句柄泄漏（fd 泄漏）**。现象：服务跑几天报 `Too many open files`，新连接建不起来，重启就好、过几天又犯。原因：某条异常路径 open/socket/连接后没 close——崩溃时 finally 也没执行。排查：`lsof -p <pid>` 看 fd 类型分布（file 多→文件泄漏，socket 多→连接泄漏）；修复：一律 `with open(...)` / try-finally，连接池设上限。
2. **坑 2：以为 write 返回就万事大吉**。现象：写入成功后掉电，数据丢了。原因：write 只到内核页缓存，磁盘可能还没动。修复：关键数据（订单、事务日志）必须 fsync；普通日志攒批换性能——两者是明确的取舍，不是谁对谁错。
3. **坑 3：崩溃后日志只剩前半截**。现象：进程崩了，出问题前的最后几条日志不见了。原因：日志还在用户态/内核缓冲里，没来得及 flush。排查：关键节点显式 flush，或把日志框架设为逐行刷盘（牺牲一点性能）。
4. **坑 4：删了文件磁盘空间却不释放**。现象：`rm` 了大日志，`df` 显示磁盘还满着，`du` 却变小了。原因：还有进程握着这个文件的 fd，inode 链接数没归零，数据块不释放。排查：`lsof | grep deleted` 找到握着死文件的进程，重启或 truncate 它。
5. **坑 5：把 close 当成 fsync 用**。现象：每次写完都 close 了，掉电还是丢最后一段。原因：close 只归还把手，不保证页缓存刷盘。修复：需要落盘保证的场景显式 fsync；顺便知道 close 前不 flush 还会丢用户态缓冲里的尾巴。

## 小练习

1. 跑实验 1；把 `ulimit -n` 的输出和崩溃位置对照解释；再改代码让它每开 100 个就关掉全部再继续，确认能一直开下去——体会「泄漏」与「复用」的区别。
2. 跑实验 2，把 `f.flush()` 一行注释掉再跑一次，记录两处输出的差异；再解释：为什么 flush 后「另一个 open()」立刻能读到，而磁盘上其实还没写。
3. 扩展实验 3：把两个名字都 remove 掉，再 `os.path.exists` 检查；结合「链接数归零才释放」解释为什么这之后数据就真没了、恢复软件为什么还有机会找回（数据块内容没被立刻覆写）。
4. **综合排查任务**：一个跑批服务三天后报 `Too many open files`，且每次机房掉电后恢复运行都会丢最后约 2 分钟的日志。写一份 6 行诊断：① 用 `lsof -p <pid>` 确认 fd 是什么类型在涨；② 定位代码里的哪类泄漏路径；③ 给出 `with`/finally 修复；④ 解释「丢 2 分钟」对应三段旅程的哪一站；⑤ 给关键日志设计 flush/fsync 策略（哪些行必须 fsync）；⑥ 给 fd 数量加一条监控报警。
