---
id: l-dsa-stack-queue
slug: stack-queue
title: 栈与队列
difficulty: 1
estMinutes: 70
tags: [数据结构, 栈, 队列, 单调栈, deque]
summary: 用「只许动顶上那张盘子」理解栈、用「排队买饭」理解队列，推导括号匹配的完整过程，做透 LeetCode 20 与 155 两道真题，最后用单调栈解决下一个更大元素。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Stack & Queue
    url: https://visualgo.net/zh/list
    type: tool
    difficulty: 1
    note: 动画演示入栈出栈与入队出队的过程。
  - id: r-py-deque
    title: Python 官方文档 · collections.deque
    url: https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
    type: doc
    difficulty: 2
    note: 双端队列的官方文档，队列题的标准工具。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 3 章「递归与调用栈」把栈讲得最透。
---

> 一句话定义：栈和队列都是「被限制得只剩一个出入口」的线性结构——栈后进先出（LIFO），队列先进先出（FIFO），限制换来了 O(1) 的操作和一大类天然匹配的问题。

## 概念讲解

![栈与队列的进出规则](fig:dsa-stack-queue)

### 栈：只许动顶上那张盘子的餐厅

栈（stack）像餐厅里叠盘子：新盘子放最顶上（入栈 push），取也只取最顶上那张（出栈 pop）。**最后进来的最先出去**，中间的盘子你根本摸不到。

```text
入栈 push(2)      出栈 pop() → 返回 2
 ┌───┐             ┌───┐
 │ 3 │  ← 栈顶     │ 1 │  ← 栈顶（3 已被取走）
 │ 1 │             │ 7 │
 └───┘             └───┘
 底下封死，一切操作都发生在栈顶
```

为什么要有这么「死板」的结构？因为**恰好有一大类问题天然是 LIFO 的**：函数调用（后调用的先返回）、撤销操作（撤销的总是最近一步）、括号匹配（后出现的左括号先被右括号配对）、DFS（后发现的岔路先探索）。栈的限制不是缺陷，而是「这个问题的天然形状」。栈的操作复杂度：push/pop/peek 全部 O(1)——不管里面有多少元素，动顶上那张而已。

### 栈的两种实现方式对照

| 实现方式 | 写法 | push | pop | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| 动态数组（list 尾部） | `append` / `pop()` | 均摊 O(1) | O(1) | Python 首选，缓存友好 |
| 链表（头部插删） | `add_at_head` / 删头 | O(1) | O(1) | 需手写节点，缓存差 |
| list 头部当栈顶 | `insert(0)` / `pop(0)` | O(n) | O(n) | **错误方向**，整体搬移 |

结论简单：**用 list 的尾部当栈顶**。链表版只在没有动态数组的环境（或面试要求手写）时才有意义。顺带注意：`pop(0)` 是队列的心智，不是栈的。

### 队列：排队买饭的窗口

队列（queue）是排队：先来的先买（出队 dequeue），新来的站队尾（入队 enqueue）。**先进先出**，公平且有序。它匹配的问题同样天然：BFS（先发现的节点先探索）、任务调度（先提交先执行）、消息队列（先发的消息先消费）。

实现上有个著名的坑：如果用 list 做「尾部入、头部出」，`pop(0)` 是 O(n)——每次出队全体左移。标准答案是**双端队列 deque**：

```python
from collections import deque
q = deque()
q.append("任务1")        # 尾部入队 O(1)
q.append("任务2")
q.appendleft("插队者")   # 头部入队 O(1)   ← 还能当反向队列
print(list(q))           # ['插队者', '任务1', '任务2']
print(q.popleft())       # 插队者 ← 头部出队 O(1)，list 做不到
print(q.pop())           # 任务2  ← 尾部也能 O(1) 出
```

deque 的底层是「双向链表块」（每块一个小数组），两端操作都是真 O(1)。顺带一句**循环队列**：定长数组也能实现队列——把数组首尾逻辑上接成环，用两个指针（head/tail）沿环移动，满了不再扩容，是嵌入式和操作系统里省内存的经典做法；在 Python 里知道它存在即可，日常直接用 deque。

### 应用场景大全：栈和队列串起整个计算机世界

| 领域 | 用什么 | 场景 |
| ---- | ---- | ---- |
| 编程语言 | 栈 | 函数调用栈：每调用一次压一帧，return 弹一帧（递归一课的主角） |
| 编辑器 | 栈 | 撤销（Ctrl+Z）：每步操作压栈，撤销弹栈 |
| 浏览器 | 双栈 | 后退栈 + 前进栈，跳页在两栈间倒手 |
| 语法解析 | 栈 | 括号匹配、表达式求值、JSON 解析 |
| 图算法 | 队列 | BFS 最短路径（图一课的主角） |
| 操作系统 | 队列 | 进程调度、打印队列 |
| 分布式系统 | 队列 | 消息队列（Kafka/RabbitMQ）：削峰、解耦、异步 |
| 刷题 | 单调栈 | 「下一个更大元素」类问题的专用武器 |

看得出规律：**要「最近」就找栈，要「先后次序」就找队列**。

## 代码示例

### 第 1 部分：LeetCode 20 有效括号（完整解法）

```python
# 题目：给定只含 ()[]{} 的字符串 s，判断是否有效。
# 有效 = 左括号必须用同类型右括号闭合，且嵌套顺序正确。
# 例："()[]{}" → True；"(]" → False；"([)]" → False；"{[]}" → True

def is_valid(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}   # 右括号 → 对应左括号
    stack = []
    for ch in s:
        if ch in '([{':        # 左括号：压栈，等它的另一半
            stack.append(ch)
        else:                  # 右括号：必须和栈顶配对
            if not stack or stack[-1] != pairs[ch]:
                return False   # 两种非法：栈空（右多了）/ 栈顶不配（交叉嵌套）
            stack.pop()        # 配对成功，弹栈
    return not stack           # 结束时栈必须空，否则左括号多了

# 非法场景逐个推演：
# "(]"    : '(' 入栈 → 遇 ']'，栈顶 '(' ≠ '[' → False（类型不符）
# "([)]"  : '(' 入栈 → '[' 入栈 → 遇 ')'，栈顶是 '[' ≠ '(' → False（交叉嵌套）
# "((("   : 三次入栈，结束时栈非空 → False（左括号多了）
# "())"   : 第二个 ')' 时栈已空 → False（右括号多了）
# "{[]}"  : '{' 入栈 → '[' 入栈 → ']' 配 '[' 弹栈 → '}' 配 '{' 弹栈 → 栈空 True

for s in ("()[]{}", "(]", "([)]", "{[]}", "(((", "())"):
    print(s, "→", is_valid(s))
# ()[]{} → True
# (] → False
# ([)] → False
# {[]} → True
# ((( → False
# ()) → False
```

四个非法场景对应四种失败模式：右多了、交叉嵌套、左多了、右多了。栈顶永远是「最近的、还没被闭合的左括号」，这就是 LIFO 与括号嵌套的同构关系——为什么这题用栈，本质是问题形状的匹配。

### 第 2 部分：LeetCode 155 最小栈（完整解法）

```python
# 题目：设计一个栈，支持 push/pop/top/getMin 四个 O(1) 操作，
# getMin 返回当前栈里的最小值。

class MinStack:
    def __init__(self):
        self.stack = []          # 主栈：正常存数据
        self.min_stack = []      # 影子栈：和主栈等长，存「到此为止的最小值」

    def push(self, val):                          # O(1)
        self.stack.append(val)
        cur_min = val if not self.min_stack else min(val, self.min_stack[-1])
        self.min_stack.append(cur_min)            # 影子跟着压入「新最小值」

    def pop(self):                                # O(1)
        self.stack.pop()
        self.min_stack.pop()                      # 影子同步弹出，最小值回滚

    def top(self) -> int:                         # O(1)
        return self.stack[-1]

    def getMin(self) -> int:                      # O(1)
        return self.min_stack[-1]                 # 影子栈顶就是答案

# 推演一遍理解影子栈为什么这么存：
# 依次 push 5, 3, 7, 2：
# 主栈:   [5] [5,3] [5,3,7] [5,3,7,2]
# 影子栈: [5] [5,3] [5,3,7→3] [5,3,7,3→2]   ← 每格存「到此为止的最小」
#         影子: 5   3      3        2
# pop 2 后 getMin 立刻回到 3；pop 7 后仍是 3；pop 3 后回到 5。
# 关键：最小值一旦被「后来的更小值」覆盖，弹栈时要能恢复历史——
# 影子栈记录的就是每个时刻的最小值快照。

s = MinStack()
for v in (5, 3, 7, 2):
    s.push(v)
print(s.getMin())   # 2
s.pop()
print(s.getMin())   # 3
s.pop()
print(s.getMin())   # 3
s.pop()
print(s.getMin())   # 5
```

「辅助结构同步维护快照」是最小栈的通用思路：当 pop 可能撤销状态时，任何 O(1) 查询都必须把历史一并记下。

### 第 3 部分：单调栈直觉题——下一个更大元素

```python
# 问题：对数组中每个元素，找它右边第一个比它大的元素的下标，没有则 -1。
# 例：[2, 1, 2, 4, 3] → [3, 2, 3, -1, -1]

def next_greater(nums):
    res = [-1] * len(nums)
    stack = []                       # 存下标，栈内对应值从底到顶递减
    for i, v in enumerate(nums):
        # 新来的 v 把栈顶所有「比它小」的元素解决掉
        while stack and nums[stack[-1]] < v:
            idx = stack.pop()        # v 就是 idx 的下一个更大元素
            res[idx] = i
        stack.append(i)              # v 自己排队等它的「更大元素」
    return res

print(next_greater([2, 1, 2, 4, 3]))   # [3, 2, 3, -1, -1]
```

直觉推演：遍历到 4 时，栈里还有 2(下标0)、1(下标1) 等着——4 一来，1 被 4 解决（res[1]=3）、2 被 4 解决（res[0]=3），只剩 4 自己排队。**每个元素入栈一次、出栈一次，总操作 2n，整体 O(n)**——比暴力两两比较的 O(n²) 整整降了一个阶级。记住手感：题目问「下一个更大/更小/ warmer」就往单调栈想。

## 常见坑

1. **坑 1：用 list 头部当栈顶或队列头**。现象：insert(0)/pop(0) 写在循环里，数据量一大慢成平方级。原因：头部操作让数组全体搬移，O(n)。排查：栈用尾部 append/pop；队列一律用 deque。
2. **坑 2：括号匹配只判断「数量相等」**。现象：`"([)]"` 数量完全配对却判断为有效。原因：真正的约束是嵌套顺序，不是数量。排查：必须是栈顶配对——栈顶代表「最近未闭合的左括号」，这正是 LIFO 的用武之地。
3. **坑 3：栈空时调 peek/pop**。现象：随机测试集上崩 IndexError。原因：空栈没有栈顶。排查：pop/peek 前判 `if not stack: return None/False`，LeetCode 20 里 `not stack or stack[-1] != pairs[ch]` 的短路顺序不能颠倒。
4. **坑 4：最小栈只存「当前最小值」不存快照**。现象：pop 掉最小值后 getMin 返回错误答案。原因：单一变量无法回滚历史。排查：用影子栈同步压弹（快照），或每个节点自带 min 字段。
5. **坑 5：认为 deque 是「双向数组」所以随便用下标**。现象：`q[i]` 写在循环里，复杂度退化。原因：deque 的随机访问是 O(n)（要从最近端数过去）。排查：deque 只用两端操作和遍历，要随机访问就换 list。
6. **坑 6：递归深度当栈内存无限**。现象：递归一深就 RecursionError。原因：Python 的函数调用栈默认上限约 1000 层（递归一课详解）。排查：`sys.getrecursionlimit()` 查看，深层递归改迭代或用显式列表当栈。

## 小练习

1. 手推：字符串 `"{[()()]}"` 逐字符写出栈的变化（每步栈内容），最后用代码验证。
2. 用两个栈实现一个队列（LeetCode 232）：一个栈负责入、一个负责出，写出 push/pop 并推导为什么均摊 O(1)。
3. LeetCode 739 每日温度：用第 3 部分的单调栈模板改一行比较方向就能做，做完对比暴力 O(n²) 的提交耗时。
4. 思考题：浏览器的后退/前进为什么要两个栈？在「A→B→C→D 后退两次再前进一次」的过程中推演两栈内容的变化。
