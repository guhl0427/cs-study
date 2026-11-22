---
id: l-dsa-array-list
slug: array-list
title: 数组与链表
difficulty: 1
estMinutes: 40
tags: [数据结构, Python]
summary: 数组用「连续内存」换随机访问，链表用「指针串联」换灵活增删——几乎所有结构都建立在它们之上。
updated: 2026-11-22
resources:
  - id: r-py-list-doc
    title: Python 官方教程 · 数据结构
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html
    type: doc
    difficulty: 1
    note: list 的官方行为说明，本节的 Python 落点。
  - id: r-visualgo-list
    title: VisuAlgo · 链表可视化
    url: https://visualgo.net/zh/list
    type: tool
    difficulty: 1
    note: 动画演示插入删除时指针怎么变化。
---

> 一句话定义：数组把元素**连续**排在一起（按下标直达），链表用指针把元素**串**起来（增删只动指针）——选型看你读得多还是改得多。

## 概念讲解

**数组**像电影院的连排座位：座位号连续，报编号就能直达（随机访问 O(1)）；代价是「中间塞人」要把后面所有人往后挪一位（插入删除 O(n)）。

```
数组： [ 10 ][ 20 ][ 30 ][ 40 ]              连续内存，按下标直达
链表： [10|•] → [20|•] → [30|•] → [40|∅]     节点散落，next 指针串联
```

**链表**像寻宝游戏：每个节点存「数据 + 下一个节点的地址」。查找只能从头一个个问（O(n)），但插入删除只需改两根指针——位置已知时是 O(1)。

**Python 的 list 是动态数组**：底层连续内存，装满时自动换更大的块。所以 `append` 平均 O(1)、按下标访问 O(1)；而 `insert(0, x)`、`pop(0)` 是 O(n)——头部操作最贵。

| 场景 | 首选 | 原因 |
|---|---|---|
| 按下标频繁读 | 数组/list | 随机访问 O(1) |
| 尾部追加 | 数组/list | append 均摊 O(1) |
| 中间频繁插删 | 链表 | 已知位置时只动指针 |
| 长度不定、频繁增删 | 链表 | 不用搬元素 |

## 代码示例

手写一个最小单链表，体会指针怎么动：

```python
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None            # 指向下一个节点

class LinkedList:
    def __init__(self):
        self.head = None

    def push_front(self, val):      # 头插，O(1)
        node = Node(val)
        node.next = self.head       # 先牵新：新节点牵住原头
        self.head = node            # 再断旧：head 改指新节点

    def to_list(self):              # 遍历，O(n)
        out, cur = [], self.head
        while cur:
            out.append(cur.val)
            cur = cur.next
        return out

lst = LinkedList()
for v in [30, 20, 10]:
    lst.push_front(v)               # 连续头插
print(lst.to_list())                # [10, 20, 30]——后插的在前
```

实测尾部追加与头部插入的差距：

```python
import time
n = 100_000
t0 = time.perf_counter()
tail = []
for i in range(n):
    tail.append(i)                  # 尾部追加，均摊 O(1)
print(time.perf_counter() - t0)     # 约 0.01 秒
t0 = time.perf_counter()
head = []
for i in range(n):
    head.insert(0, i)               # 头插，每次搬动全部元素，O(n)
print(time.perf_counter() - t0)     # 约 1~2 秒，慢上百倍
```

## 常见坑

1. **坑 1：用 `insert(0, x)` / `pop(0)` 当队列**。每次搬动整个列表，O(n)。现象：数据一大就卡。排查：换 `collections.deque`（见「栈与队列」）。
2. **坑 2：改链表指针顺序搞反**。先断旧链再接新链会「丢」后半段。口诀：先牵新、后断旧——`node.next = self.head` 必须在前。
3. **坑 3：以为 list 中间插入也很快**。`insert(i, x)` 平均要搬一半元素。插入成了瓶颈时，先怀疑它。

## 小练习

1. 给 LinkedList 加 `push_back`：从 head 走到最后一个节点再挂上去——这个方法的复杂度是多少？
2. 写 `reverse(lst)` 反转单链表（逐个改 next 指向，建议先画图）。
3. 思考题：为什么数组按下标访问是 O(1)？用「起始地址 + 下标 × 元素大小」解释。
