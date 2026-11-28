---
id: l-dsa-recursion
slug: recursion
title: 递归
difficulty: 2
estMinutes: 75
tags: [算法, 递归, 调用栈, 记忆化, 汉诺塔]
summary: 用三要素框架写对任何递归，画出调用栈与递归树看懂执行过程，用 lru_cache 实测记忆化的威力，完成汉诺塔经典解法，最后掌握递归转迭代与栈深度限制。
updated: 2026-11-22
resources:
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 3 章用调用栈图解递归，与本课图示一一对应。
  - id: r-py-lru
    title: Python 官方文档 · functools.lru_cache
    url: https://docs.python.org/zh-cn/3/library/functools.html#functools.lru_cache
    type: doc
    difficulty: 2
    note: 记忆化的标准工具，本课实测实验的主角。
  - id: r-visualgo
    title: VisuAlgo · Recursion Tree
    url: https://visualgo.net/zh/recursion
    type: tool
    difficulty: 2
    note: 动画展示递归树展开与记忆化剪枝。
---

> 一句话定义：递归是「函数调用自己解决一个更小的同款问题」——只要写对基线条件、递归步骤、问题缩小三要素，再把重复子问题交给记忆化，它就从玄学变成套路。

## 概念讲解

![递归展开与调用栈的对应关系](fig:dsa-recursion)

### 三要素：任何递归都能拆成这三块

| 要素 | 回答的问题 | 反例症状 |
| ---- | ---- | ---- |
| ① 基线（base case） | 最小的问题，直接给答案、不再递归 | 缺了它 → 无限递归 → RecursionError |
| ② 递归步骤 | 用更小的问题的答案组装我的答案 | 写错它 → 逻辑错但能跑完 |
| ③ 问题缩小 | 每次调用必须朝基线靠近一步 | 缩小不了 → ①失效，同样无限递归 |

以阶乘 `factorial(n)` 为例：基线是 `n <= 1` 时返回 1；递归步骤是 `n * factorial(n - 1)`；缩小是 `n - 1`。三块各司其职。写递归时**不要展开想象整个调用过程**，只信一件事：「如果 f(n-1) 已经返回了正确答案，我补上最后一步就是 f(n) 的正确答案」——这个信任叫**递归信仰之跃**。人脑硬追踪调用栈会爆，数学归纳才是递归的正确打开方式。

### 调用栈与栈帧：递归到底怎么执行

每次函数调用，Python 都压一个**栈帧**（记录参数、局部变量、返回地址）到调用栈，函数返回时弹栈。递归就是把同一函数的多个栈帧叠起来：

```text
factorial(4) 的调用栈生长与收缩：

压栈阶段（问题越拆越小）          弹栈阶段（答案逐层返回）
┌───────────────┐                ┌───────────────┐
│ f(1) → 返回 1  │ ← 栈顶先弹     │ f(4) = 4×6=24 │ ← 最后算完
│ f(2) = 2×?    │                │ f(3) = 3×2=6  │
│ f(3) = 3×?    │                │ f(2) = 2×1=2  │
│ f(4) = 4×?    │                │ f(1) = 1      │
└───────────────┘                └───────────────┘
  基线触底，栈最深 4 层             从栈顶往下逐层乘回去
```

两个要点：一，栈帧**占真实内存**，深度 n 的递归就占 O(n) 栈空间——这就是空间复杂度要算递归账的原因；二，所有压栈必须先完成才能开始弹栈，「先把小事全问清楚，才能逐个交差」。栈与队列一课说「函数调用栈是栈的第一应用场景」，此刻兑现。

### 递归树：可视化递归的形状

一次递归调用如果**分支出多次**自己（比如 f(n) 调 f(n-1) 和 f(n-2)），调用栈图就不够用了，改画**递归树**：

```text
fib(5) 的递归树（无记忆化）：

                    fib(5)
                   /      \
              fib(4)        fib(3)
             /     \        /    \
        fib(3)   fib(2)  fib(2)  fib(1)
        /    \    /   \    /   \
   fib(2) fib(1) ... ...  ... ...
    /   \
 fib(1) fib(0)

同一棵子树被重复计算：fib(3) 算 2 次、fib(2) 算 3 次…
节点数指数增长，O(2ⁿ) —— 这是「重复子问题」的代价
```

画法三步：根是原始问题；每个节点分叉成它的递归调用；叶子是基线。读树两眼：**深度**决定栈空间，**节点总数**决定时间复杂度（大 O 一课「递归复杂度 = 递归树节点数」在此兑现）。

### 记忆化：给重复子问题建一本账

递归树里 fib(2) 算了 3 次——**重复子问题**。记忆化（memoization）就是算过的答案存进 dict，再遇到直接查表：

```text
加了记忆化的 fib(5) 树：
                    fib(5)
                   /      \
              fib(4)        fib(3)✂ ← 发现 fib(3) 已在账上，整棵子树剪掉
             /     \
        fib(3)   fib(2)✂ ← 同样剪掉
        /    \
   fib(2)  fib(1)
   /   \
 fib(1) fib(0)

每个 n 只真算一次，树从指数膨胀塌缩成一条 O(n) 的链
时间 O(n)，代价一本 O(n) 的账（空间换时间）
```

Python 标准工具是 `functools.lru_cache`：一行装饰器完成「查表→命中返回→未命中执行→记账」。注意它只能包住**参数可哈希**的函数——和哈希表一课的键要求同源。实战对比见代码示例第 2 部分，n=35 时朴素版与记忆化版差数千倍。

### 递归转迭代与栈溢出

递归的两大现实约束：

1. **深度限制**：Python 默认调用栈约 1000 层（`sys.getrecursionlimit()` 可查）。深层递归会 RecursionError——不是逻辑错，是栈内存爆了。
2. **函数调用开销**：每层栈帧的压弹都有成本，比循环慢。

所以工程上的守则是：**能轻松写成循环的（线性收敛，如阶乘、求和）就用循环；天然是树形分叉的（树遍历、分治、回溯）才用递归**。转迭代的方法是「自己显式管理那个栈」：用一个 list 当栈，把递归压帧改成手动 append、弹帧改成手动 pop——树一课的迭代遍历就是这么写的。递归与循环是同一件事的两种表达，翻译关系比想象中机械。

## 代码示例

### 第 1 部分：三要素示范 + 汉诺塔完整解法

```python
def factorial(n):                     # 三要素模板
    if n <= 1:                        # ① 基线：最小问题直接给答案
        return 1
    return n * factorial(n - 1)       # ② 递归步骤  ③ 问题缩小 n-1
print(factorial(5))                   # 120

def hanoi(n, src, aux, dst):          # 汉诺塔：n 个盘从 src 借 aux 移到 dst
    """返回移动步骤列表"""
    steps = []
    def move(k, a, b, c):             # 把 k 个盘从 a 借 b 移到 c
        if k == 1:                    # ① 基线：只剩 1 个盘，直接移
            steps.append(f"{a}->{c}")
            return
        move(k - 1, a, c, b)          # ② 上面 k-1 个盘先搬到中转柱
        steps.append(f"{a}->{c}")     #    最大的盘从 a 直接移到 c
        move(k - 1, b, a, c)          #    k-1 个盘从中转柱搬到 c
    move(n, src, aux, dst)
    return steps                      # ③ 缩小：每次处理 k-1 个盘

steps = hanoi(3, "A", "B", "C")
print(len(steps), "步")               # 7 步（2³ - 1）
print(steps)
# ['A->C', 'A->B', 'C->B', 'A->C', 'B->A', 'B->C', 'A->C']
# 递归信仰之跃：不用管 k-1 个盘怎么挪的细节（move 会搞定），
# 只保证「先挪走上面的，搬最大的，再把上面的盖回来」三步对即可。
# 复杂度：步数 = 2ⁿ - 1，时间/空间均 O(2ⁿ)（steps 列表）
print(len(hanoi(10, "A", "B", "C")))  # 1023 —— 指数增长，20 盘已需百万步
```

汉诺塔是「信仰之跃」的最佳教材：三行递归，正确性靠归纳法不靠脑内模拟。

### 第 2 部分：LeetCode 509 斐波那契——三种写法实测对照

```python
import time
from functools import lru_cache

# 写法一：朴素递归（跟着递归树走，O(2ⁿ)）
def fib_naive(n):
    if n <= 1:                        # 基线：fib(0)=0, fib(1)=1
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)

# 写法二：记忆化递归（lru_cache 一行，O(n)）
@lru_cache(maxsize=None)
def fib_memo(n):
    if n <= 1:
        return n
    return fib_memo(n - 1) + fib_memo(n - 2)

# 写法三：迭代（自底向上，O(n) 时间 O(1) 空间）
def fib_iter(n):
    if n <= 1:
        return n
    prev, cur = 0, 1                  # 只滚两个变量
    for _ in range(2, n + 1):
        prev, cur = cur, prev + cur
    return cur

for f, name in ((fib_naive, "朴素"), (fib_memo, "记忆化"), (fib_iter, "迭代")):
    t0 = time.perf_counter()
    r = f(30)
    dt = time.perf_counter() - t0
    print(f"{name}  fib(30)={r}  {dt*1000:.2f} ms")
# 参考输出：
# 朴素   fib(30)=832040  约 150~300 ms    ← 约 270 万次函数调用
# 记忆化 fib(30)=832040  约 0.03 ms       ← 差约 1 万倍
# 迭代   fib(30)=832040  约 0.01 ms
# 再试 fib_naive(40) 要数十秒；fib_memo/fib_iter(40) 依然瞬间
# 注意 fib_memo(500) 会 RecursionError——记忆化救了时间救不了栈深，见坑 4
```

三种写法同一答案、三个阶级：O(2ⁿ) → O(n)/O(n) → O(n)/O(1)。**重复子问题 + 记忆化**是面试最高频的优化链路，务必亲手测一次。

### 第 3 部分：递归转迭代——显式栈翻译法

```python
def sum_rec(n):                       # 递归版：O(n) 栈深
    if n == 0:
        return 0
    return n + sum_rec(n - 1)

def sum_iter(n):                      # 迭代版：O(1) 栈深
    total = 0
    while n > 0:
        total += n
        n -= 1
    return total

def sum_stack(n):                     # 显式栈版：手动压弹，翻译递归
    stack, total = [], 0
    stack.append(n)                   # 「压帧」= 把待处理的问题入栈
    while stack:
        k = stack.pop()               # 「弹帧」= 取出一个问题
        if k == 0:                    # 基线
            continue
        total += k                    # 本层该做的事
        stack.append(k - 1)           # 「缩小」：派生更小的问题
    return total

print(sum_rec(100), sum_iter(100), sum_stack(100))   # 5050 5050 5050
# sum_rec(100000)  → RecursionError
# sum_stack(100000) → 正常返回 5000050000
```

线性收敛的递归一律可以这么翻。真正离不开递归的是**树形分叉**（遍历树、分治）——那类问题的显式栈版本会在二叉树一课出现。

## 常见坑

1. **坑 1：忘记基线或缩小错误**。现象：RecursionError: maximum recursion depth exceeded。原因：某条调用链永远到不了基线。排查：先检查每个分支的「缩小量」是否真的朝基线走，再把基线条件列全（0、1、空表三个都是常见基线）。
2. **坑 2：脑内模拟多层递归**。现象：追踪到第三层就头晕，写错组装步骤。原因：人脑栈容量有限。排查：改用「信仰之跃」——只证明相邻两层衔接正确，用小规模输入跑代码验证。
3. **坑 3：记忆化函数参数不可哈希**。现象：@lru_cache 后 TypeError: unhashable type: 'list'。原因：cache 用参数当 dict 键，list 不可哈希（哈希表一课同款原理）。排查：把 list 参数改成 tuple，或改用自建 dict 记账。
4. **坑 4：以为记忆化解决一切**。现象：fib_memo(2000) 依然 RecursionError。原因：lru_cache 只剪时间，调用深度仍是 O(n)，栈深限制照旧。排查：深层数值型递归改迭代版，或 `sys.setrecursionlimit`（治标）。
5. **坑 5：递归修改全局/共享可变对象不当**。现象：多分支递归后对象状态互相污染。原因：各栈帧共享同一对象引用，一处分改处处变。排查：回溯类问题每层进入前改、离开后**撤销**（回溯的核心动作），或在每层复制局部副本。
6. **坑 6：对「尾部递归」抱 Python 幻想**。现象：期待 Python 像 Lisp 一样优化尾递归。原因：CPython 不做尾调用优化，深递归必占 O(n) 栈。排查：把尾递归直接机械改成 while 循环（对照第 3 部分）。

## 小练习

1. 用递归实现 `reverse(s)` 返回反转字符串（基线：空串返回空串）。写出三要素各是哪一行，并用 n=3 的输入手推调用栈的压与弹。
2. 画出 fib(4) 的完整递归树：数出 fib(2) 被计算几次、树共几个节点；再画加记忆化后的形状，验证「塌缩成链」。
3. LeetCode 70 爬楼梯：每次爬 1 或 2 阶，n 阶有几种走法？先识别它就是斐波那契，用三种写法各提交一次，对比耗时。
4. 思考题：为什么汉诺塔步数必是 2ⁿ - 1？用「最大盘必须单独移动一次、其上之下的盘子各需完整两轮」写出两行归纳论证。
