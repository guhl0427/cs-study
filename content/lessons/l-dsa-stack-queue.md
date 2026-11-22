---
id: l-dsa-stack-queue
slug: stack-queue
title: 栈与队列
difficulty: 1
estMinutes: 35
tags: [数据结构, Python]
summary: 栈后进先出像叠盘子，队列先进先出像排队——两个最简单的受限结构，撑起函数调用、撤销和 BFS。
updated: 2026-11-22
resources:
  - id: r-deque-doc
    title: Python 官方文档 · collections.deque
    url: https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
    type: doc
    difficulty: 1
    note: 双端队列官方文档，Python 里栈与队列的标准答案。
  - id: r-ds-visual
    title: 数据结构可视化（USF）
    url: https://www.cs.usfca.edu/~galles/visualization/StackArray.html
    type: tool
    difficulty: 1
    note: 动画演示栈的 push/pop，同站还有队列。
---

> 一句话定义：栈是「后进先出」的一摞盘子，队列是「先进先出」的一条队——限制出入位置，换来 O(1) 的确定操作。

## 概念讲解

**栈（Stack）**——只能在一端进出，像叠盘子：放只放最上面，拿也只拿最上面的。后进先出（LIFO）。

```
push ─▶  ┌────┐
         │ 30 │ ◀─ pop（弹出）/ peek（只看顶部不取）
         │ 20 │
         │ 10 │
         └────┘
```

三个基本操作：`push` 入栈、`pop` 出栈、`peek` 看栈顶——全部 O(1)。

**队列（Queue）**——两头分工，像排队买票：队尾 `enqueue` 入队，队头 `dequeue` 出队，先进先出（FIFO）。

为什么栈能用 Python list、队列却不行？`append` 和 `pop()` 都在尾部，天然是栈；当队列用 `pop(0)` 或 `insert(0, x)` 时，每次都要把全部元素往前搬——O(n)。**`collections.deque` 两端操作都是 O(1)**，才是队列的正解。

这些结构藏在日常工具里：**函数调用**是栈（后调用的先返回）；**编辑器撤销**是栈（撤销最近一步）；**广度优先搜索 BFS** 用队列（先发现的节点先处理）。

## 代码示例

经典应用：括号匹配。左括号压栈，右括号来时必须和栈顶配对：

```python
def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)            # 左括号：入栈
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False            # 栈空或栈顶不配对 → 失败
    return not stack                    # 走完还剩左括号 → 失败

print(is_balanced("a[b]{(c)}"))         # True
print(is_balanced("([)]"))              # False：] 来时栈顶是 (
print(is_balanced("((("))               # False：左括号没消化完
```

用栈模拟撤销，用 deque 当队列：

```python
history = []
history.append("输入 hello")       # 每个动作入栈
history.append("加粗")
history.append("改颜色")
print(history.pop())               # 改颜色——撤销最近一步
print(history.pop())               # 加粗

from collections import deque
queue = deque()
queue.append("任务甲")              # 队尾入队
queue.append("任务乙")
print(queue.popleft())             # 任务甲——队头出队，O(1)
```

## 常见坑

1. **坑 1：用 list 当队列**。`pop(0)` 每次搬动全部元素，O(n)。现象：BFS 数据量大时明显变慢。排查：换 `deque.popleft()`。
2. **坑 2：pop 前不检查空**。空列表 `pop()`、空 deque `popleft()` 都抛 `IndexError`。排查：先 `if stack:` 再操作。
3. **坑 3：括号匹配忘了「栈空」判断**。右括号先来时 `stack.pop()` 直接报错而不是返回 False。排查：`not stack` 要写在 pop 之前（短路求值先拦住）。

## 小练习

1. 用栈判断一串 `(`、`)` 是否合法，写 3 组测试：合法、不配对、多左括号。
2. 用 deque 做「打印任务队列」：3 个任务依次入队，再按顺序出队打印。
3. 思考题：浏览器「后退」按钮更像栈还是队列？说说它的入栈出栈时机。
