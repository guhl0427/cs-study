---
id: l-dsa-array-list
slug: array-list
title: 数组与链表
difficulty: 1
estMinutes: 75
tags: [数据结构, 数组, 链表, 内存布局]
summary: 从内存地址计算原理理解数组为何 O(1) 随机访问，亲手模拟动态数组扩容，手写完整的单链表类，再用 LeetCode 206 与 21 两道真题打通链表操作的手感。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Linked List
    url: https://visualgo.net/zh/list
    type: tool
    difficulty: 1
    note: 动画演示数组和链表的插入删除，把本课的图动起来。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 2 章数组和链表的经典入门讲法。
  - id: r-py-list
    title: Python 官方文档 · list
    url: https://docs.python.org/zh-cn/3/library/stdtypes.html#lists
    type: doc
    difficulty: 2
    note: list 各方法的复杂度官方口径，选型时对照。
---

> 一句话定义：数组用「一段连续内存 + 下标换算地址」换来 O(1) 随机访问，链表用「指针把散落的节点串起来」换来 O(1) 插删——两者的一切差异都从这张内存地图上长出来。

## 概念讲解

![数组的连续内存与链表的指针节点对比](fig:dsa-array-list)

### 数组的内存布局：为什么按下标访问是 O(1)

数组在内存里是**一整块连续空间**，元素首尾相接：

```text
 内存地址:  0x1000  0x1004  0x1008  0x100C  0x1010
          ┌───────┬───────┬───────┬───────┬───────┐
  int 数组 │   17  │   23  │    5  │   42  │    8  │
          └───────┴───────┴───────┴───────┴───────┘
  下标:        0       1       2       3       4
```

要取下标 3，计算机不做任何查找，只做一次**乘法和加法**：

```text
元素地址 = 起始地址 + 下标 × 每个元素的大小
0x100C   = 0x1000  +  3   ×    4 字节
```

地址一步算出来，直接去取——这就是 O(1) 的全部秘密，也是「数组下标从 0 开始」的真正原因：下标本质是**偏移量**，第一个元素的偏移自然是 0。这一设计还有个隐藏推论：每个元素大小必须相同，否则无法用乘法换算，所以 Python 的 list 存的其实都是对象的「地址」（地址等长），而真正的对象散落在堆里。

### 随机访问的另一面：中间插入要全体搬家

连续内存是把双刃剑。要在下标 2 处插入 99，后面所有元素必须**整体右移一格**腾出空位：

```text
插入前:  [17] [23] [ 5] [42] [ 8] [_]
                  ↑ 42→[3] 8→[4]     逐个后移
插入后:  [17] [23] [99] [ 5] [42] [ 8]
```

移动次数与插入点后的元素个数成正比，最坏（头部插入）O(n)。删除同理，只是改成整体左移补洞。而**尾部追加**不需要动任何元素，O(1)——除非内存满了。

### 动态数组扩容：容量翻倍与均摊 O(1)

Python list 不要求你预先定大小，它背后是一块**容量**大于**长度**的连续内存。满了怎么办？搬家：

```text
容量 4 装满 → 申请容量 8 的新内存 → 旧元素全部搬过去 → 释放旧内存
旧家: [17][23][5][42]  ──搬家──→  新家: [17][23][5][42][_][_][_][_]
```

单次扩容代价 O(n)，但和大 O 一课的均摊分析一致：容量翻倍后要再攒同样多的追加才会再次搬家，摊到每次 append 头上是均摊 O(1)。这就是为什么 append 一亿次也不会越来越慢。顺带一提，list 会**预留**空位（长度 4 时容量可能是 8），所以 `len()` 和真实占用内存不是一回事，可用 `sys.getsizeof` 观察。

### 链表：把节点散落串起来

链表完全放弃连续内存，每个**节点**自带一块数据和一个指向下一家的指针：

```text
head ──→ [12|•]──→ [99|•]──→ [37|•]──→ [5|None]
          节点A      节点B      节点C     尾节点
```

找第 i 个只能从 head 顺着指针一格一格爬，O(n)——它没有「地址换算」的资本。但插入删除只改指针，不用搬数据：

```text
在 B、C 之间插入 X：只需两步改指针
B.next ──┐                B.next ──→ X ──→ C
         ↓     变成       （原 B→C 的指针改由 X 接管）
C ←──────┘
```

这就是链表的核心交易：**牺牲随机访问，换取免搬移的插删**。代价还含隐藏项——每存一个数据多存一个指针（8 字节），内存占用比数组高，且缓存命中率差（节点散落各处，CPU 预取失灵）。双向链表再补一个 prev 指针，前后都能走、删尾部也能 O(1)，Python 的 `collections.deque` 底层就是双向链表块。

### 选型决策表：什么场景用谁

| 场景 | 选什么 | 理由 |
| ---- | ---- | ---- |
| 按下标频繁读写 | 数组 / list | O(1) 地址换算，链表爬 O(n) 吃不消 |
| 尾部追加 + 随机读（日志、待办） | 动态数组 list | append 均摊 O(1) + O(1) 读 |
| 头部频繁插删（待处理队列） | deque | list 的 insert(0) 是 O(n) |
| 中间频繁插删且手握位置 | 链表 | 改指针 O(1)，数组要整体搬移 |
| 只增不删的顺序记录 | list | 连续内存缓存友好，实际比链表快 |
| 不知道长度、频繁拼接 | deque / 链表 | 拼接只需改指针，数组要复制 |

经验法则：**90% 的场景选动态数组**——现代 CPU 的缓存让「连续内存」的隐性收益极大，链表只有在「已知位置、频繁插删」的窄场景才真赢。刷题时链表出现更多是为了考指针操作功底。

## 代码示例

### 第 1 部分：手写完整的单链表类

```python
class Node:                      # 链表节点 = 数据 + 指向下一个节点的指针
    def __init__(self, value):
        self.value = value
        self.next = None

class SinglyLinkedList:
    def __init__(self):
        self.head = None            # 头指针：找到链表的唯一入口
        self.size = 0

    def add_at_head(self, value):   # O(1)
        node = Node(value)
        node.next = self.head       # 新节点先牵住旧头
        self.head = node            # 头指针再指向新节点
        self.size += 1

    def add_at_tail(self, value):   # O(n)：不设尾指针就得爬到末尾
        node = Node(value)
        if self.head is None:
            self.head = node
        else:
            cur = self.head
            while cur.next:          # 爬到最后一个节点
                cur = cur.next
            cur.next = node
        self.size += 1

    def remove(self, value):        # O(n)：要找到才删
        if self.head is None:
            return False
        if self.head.value == value:  # 特例：删头
            self.head = self.head.next
            self.size -= 1
            return True
        prev, cur = self.head, self.head.next
        while cur and cur.value != value:
            prev, cur = cur, cur.next   # 双指针并进：prev 是关键
        if cur:
            prev.next = cur.next        # 跨过被删节点，指针改道
            self.size -= 1
            return True
        return False

    def reverse(self):              # O(n)：迭代反转三指针经典
        prev, cur = None, self.head
        while cur:
            nxt = cur.next          # ① 先记住下一个，防止断链
            cur.next = prev         # ② 当前节点掉头指回前一个
            prev = cur              # ③ prev 前进
            cur = nxt               # ④ cur 前进
        self.head = prev            # 循环结束时 prev 站在原尾节点
        return self.head

    def to_list(self):              # O(n)：调试用
        out, cur = [], self.head
        while cur:
            out.append(cur.value)
            cur = cur.next
        return out

# ---- 运行验证 ----
ll = SinglyLinkedList()
for v in (1, 2, 3, 4):
    ll.add_at_tail(v)
print(ll.to_list())        # [1, 2, 3, 4]
ll.remove(3)
print(ll.to_list())        # [1, 2, 4]
ll.reverse()
print(ll.to_list())        # [4, 2, 1]
```

反转的关键是 `nxt = cur.next` 这一步「先留后手」：指针一旦掉头，原链的下一家就找不到了。

### 第 2 部分：LeetCode 206 反转链表（完整解法）

```python
# 题目：给定单链表头节点 head，反转整个链表并返回新头。
# 例：1→2→3→4→5 变成 5→4→3→2→1

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):                     # 迭代版：O(n) 时间 O(1) 空间
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev

# 递归版：O(n) 时间 O(n) 空间（调用栈）
def reverse_list_rec(head):
    if not head or not head.next:
        return head                          # 基线：空表或只剩一个节点
    new_head = reverse_list_rec(head.next)   # 先反转后面的部分
    head.next.next = head                    # 让我的下一个指回我
    head.next = None                         # 我变成尾，斩断旧指向
    return new_head

def build(arr):
    dummy = ListNode()
    cur = dummy
    for v in arr:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def show(head):
    out = []
    while head:
        out.append(str(head.val))
        head = head.next
    return "→".join(out) if out else "None"

h = build([1, 2, 3, 4, 5])
print(show(reverse_list(h)))        # 5→4→3→2→1
h = build([1, 2, 3, 4, 5])
print(show(reverse_list_rec(h)))    # 5→4→3→2→1
```

### 第 3 部分：LeetCode 21 合并两个有序链表（完整解法）

```python
# 题目：合并两个升序链表，结果仍升序。
# 例：1→2→4 与 1→3→4 合并成 1→1→2→3→4→4

def merge_two_lists(l1, l2):        # O(m+n) 时间，O(1) 额外空间
    dummy = ListNode()              # 哑节点：让「结果头」不用特判
    tail = dummy                    # tail 始终站在结果链的末尾
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1          # 谁小谁上，指针整体接管（不新建节点）
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    tail.next = l1 if l1 else l2    # 一方耗尽，剩下整段直接接上
    return dummy.next

a = build([1, 2, 4])
b = build([1, 3, 4])
print(show(merge_two_lists(a, b)))  # 1→1→2→3→4→4
```

哑节点（dummy）是链表题的头号技巧：真实头节点身份不定，而 dummy.next 永远指向结果头，免掉「结果第一个是 1 还是 2」的特判。同样思路改造第 1 部分的 `remove`：挂一个 dummy 在 head 前，「删头」就退化成普通删除。

## 常见坑

1. **坑 1：Python list 的 insert(0, x) 当成 O(1)**。现象：在循环开头插元素，数据一多慢成倍数级。原因：list 是动态数组，头部插入要全体右移，O(n)。排查：需要两端操作换 `collections.deque`，实测对比见大 O 一课。
2. **坑 2：改 next 指针前不留后手**。现象：反转/重排链表时后半段「消失」。原因：`cur.next = prev` 一执行，原链的下一家就断了。排查：任何指针改道前先 `nxt = cur.next` 保存现场，口诀「先留后手，再掉头」。
3. **坑 3：删除头节点没特判**。现象：`remove` 删第一个元素时空指针崩溃或删不掉。原因：删头要改 head 本身，和删中间是两套逻辑。排查：用 dummy 哑节点统一处理，或开头先判 `head.value == value`。
4. **坑 4：以为链表遍历更省内存**。现象：数据量一大链表反而吃内存、还慢。原因：每节点多一个 8 字节指针，且节点散落导致 CPU 缓存失灵。排查：除非「已知位置频繁插删」，默认选动态数组。
5. **坑 5：把 `nums[k:]` 切片当免费用**。现象：循环里切片，内存翻倍、耗时爆涨。原因：切片复制出新数组，一次 O(k)，k 是切出的长度。排查：传起始下标代替切片，或用 `itertools.islice`。
6. **坑 6：遍历链表时边删边 `cur = cur.next`**。现象：删掉一个节点后下一个也被跳过。原因：删除已让 cur.next 指向新的下家，再 next 就跳了两步。排查：删除分支不前进 cur（新的 cur.next 正好是下一个待查者），或统一用 prev/cur 双指针。

## 小练习

1. 给 SinglyLinkedList 补一个 `get(index)`：返回下标处的值，越界抛异常。标注复杂度，并解释为什么它比数组的 `get` 慢。
2. 用「画指针图」的方式推演 `reverse` 对 `1→2→3` 的每一步（prev/cur/nxt 各指向谁），再给链表 `1→2` 和空链表各跑一遍验证你的推演。
3. LeetCode 141 环形链表：判断链表是否有环。提示——快慢两个指针，快的每次走两步，相遇即有环；写完标注时间与空间复杂度。
4. LeetCode 83 删除排序链表中的重复元素：在 21 题合并代码的基础上改造遍历逻辑，只保留每个值第一次出现的节点。
