---
id: l-dsa-big-o
slug: big-o
title: 复杂度与大 O 记号
difficulty: 2
estMinutes: 35
tags: [算法, 复杂度]
summary: 大 O 描述「数据翻倍、耗时怎么涨」的趋势——抓住增长阶级，写代码前就能预判它扛不扛得住大数据。
updated: 2026-11-22
resources:
  - id: r-bigo-sheet
    title: Big-O Cheat Sheet
    url: https://www.bigocheatsheet.com/
    type: tool
    difficulty: 2
    note: 各数据结构与算法的复杂度速查表。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 图解友好，讲大 O 最轻松的入门书。
---

> 一句话定义：大 O 记号描述「数据量变大时，操作次数怎么跟着涨」——它不告诉你几秒，但能告诉你哪个写法先撑不住。

## 概念讲解

同一个问题，写法不同效率可能差几千倍：在 10 万个有序元素里找目标，从头翻最多要 10 万次比较，二分查找只要 17 次。**算法优化的核心收益来自降低增长阶级，而不是抠代码细节。**

大 O 回答的问题只有一个：n 翻倍，耗时怎么变？

```
O(1)       n 翻倍 → 不变       字典取值、数组按下标访问
O(log n)   n 翻倍 → 多 1 步    二分查找（100 万数据约 20 步）
O(n)       n 翻倍 → 翻倍       遍历列表
O(n log n) n 翻倍 → 多一点     高效排序（归并、Python 内置 Timsort）
O(n²)      n 翻倍 → 变 4 倍    双重循环、两两比较
```

直觉记忆：O(1) 一次到位；O(log n) 每步砍掉一半，n 再大也就几十步；O(n) 每个元素摸一遍；O(n log n) 分 log n 层、每层扫 n 个元素；O(n²) 所有元素两两配对——n=10 万就是 100 亿次操作，肯定跑不动。

为什么写 O(n) 而不写 O(2n + 5)？大 O 只看**增长趋势**：n 很大时，常数因子和低阶项会被主导项淹没，曲线形状不变，所以 `3n² + n + 10` 一律记作 O(n²)。

空间复杂度同理，一句话：**额外**占用的内存随 n 怎么涨——遍历一遍是 O(1)，归并排序要辅助数组是 O(n)，递归深度 n 层也是 O(n)。

## 代码示例

先练「看代码报复杂度」，注释里直接给答案：

```python
def first(nums):                 # ① O(1)：与 n 无关
    return nums[0]

def total(nums):                 # ② O(n)：一层循环摸一遍
    s = 0
    for x in nums:
        s += x                   # 执行 n 次
    return s

def pairs(nums):                 # ③ O(n²)：循环套循环
    c = 0
    for a in nums:
        for b in nums:
            c += 1               # 执行 n*n 次
    return c

def halve(n):                    # ④ O(log n)：每步砍一半
    steps = 0
    while n > 1:
        n //= 2
        steps += 1              # 执行 log2(n) 次
    return steps

print(halve(1_000_000))          # 19——百万级数据不到 20 步
```

再实测 O(n) 与 O(n²) 的体感差距：

```python
import time
data = list(range(5000))

t0 = time.perf_counter()
s = sum(data)                                # O(n)：一遍扫完
print(time.perf_counter() - t0)              # 约 0.0001 秒

t0 = time.perf_counter()
s = 0
for a in data:
    for b in data:                           # 5000² = 2500 万次
        s += 1
print(time.perf_counter() - t0)              # 约 1~2 秒，差了上万倍
```

判复杂度的心法：**只数「随 n 变化的循环层数」**，别纠结单个操作本身贵不贵。

## 常见坑

1. **坑 1：以为 O(n) 一定比 O(n²) 快**。大 O 比的是大数据下的趋势；n=10 时常数小的 O(n²) 可能反超，数据量小不必纠结。
2. **坑 2：把「实测秒数」当复杂度**。同一份代码换台机器秒数全变，但曲线形状不变——比较算法只比阶级。
3. **坑 3：漏掉藏在函数调用里的循环**。`max(nums)`、`x in 列表`、切片都是 O(n)，嵌进循环整个就变 O(n²)。排查：不熟悉的内置操作先查复杂度。

## 小练习

1. 判断这段的复杂度：`for a in nums: if a in checked: ...`——checked 分别是 list 和 set 时各是多少？
2. 估算 O(n²) 在 n=100 万时的操作次数，再按每秒 1 亿次换算成运行时间。
3. 思考题：为什么 n=100 时两个阶级的算法「体感没差别」，选错复杂度依然危险？
