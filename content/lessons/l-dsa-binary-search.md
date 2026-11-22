---
id: l-dsa-binary-search
slug: binary-search
title: 二分查找
difficulty: 2
estMinutes: 30
tags: [算法, 查找]
summary: 有序数组里每次砍掉一半候选——100 万个元素最多 20 步，前提只有一个：必须有序。
updated: 2026-11-22
resources:
  - id: r-bs-book
    title: 《算法图解》第 1 章
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 开篇就讲二分查找，简短直观。
  - id: r-bs-visual
    title: 二分查找可视化（USF）
    url: https://www.cs.usfca.edu/~galles/visualization/BinarySearch.html
    type: tool
    difficulty: 1
    note: 动画演示每次比较后区间怎么收缩。
  - id: r-bs-bisect
    title: Python 官方文档 · bisect
    url: https://docs.python.org/zh-cn/3/library/bisect.html
    type: doc
    difficulty: 2
    note: 标准库的二分实现，边界处理可以直接抄。
---

> 一句话定义：二分查找在**有序**数组里每比较一次就砍掉一半候选——就是猜数字游戏里「大了 / 小了」的策略。

## 概念讲解

猜数字：1 到 100，猜 50，对方说「大了」→ 一句话砍掉一半。继续对半猜，最多 7 次必中。二分查找就是这个策略用在有序数组上：

```
[2 5 8 12 16 23 38 56 72 91]        找 23，区间 [0, 9]
第 1 步：mid=4 → 16 < 23，砍掉左半，区间 [5, 9]
第 2 步：mid=7 → 56 > 23，砍掉右半，区间 [5, 6]
第 3 步：mid=5 → 命中！
```

威力在**指数收缩**：100 万个有序元素最多 20 步（2²⁰ 已超 100 万），10 亿个也只要 30 步；线性查找平均要 50 万步。

**唯一且不可省的前提：数据有序**——无序就谈不上砍哪边。所以二分常和排序连用：先花 O(n log n) 排一次，之后查无数次。

标准模板用**闭区间**写法 `[lo, hi]`，全程不变式只有一条：目标若存在，必在 `[lo, hi]` 里。三个细节：循环条件 `lo <= hi`（= 不能丢，闭区间含两端）；跳 `mid ± 1`（mid 已查过，必须排除）；区间缩空返回 -1。

## 代码示例

```python
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1          # 闭区间 [lo, hi]
    while lo <= hi:                    # 区间非空才继续
        mid = (lo + hi) // 2           # 中点向下取整
        if nums[mid] == target:
            return mid                 # 命中，返回下标
        elif nums[mid] < target:
            lo = mid + 1               # 目标在右半，mid 已排除
        else:
            hi = mid - 1               # 目标在左半
    return -1                          # 区间缩空：不存在

nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print(binary_search(nums, 23))         # 5
print(binary_search(nums, 24))         # -1
print(binary_search(nums, 2))          # 0——两端边界也能查到
print(binary_search(nums, 91))         # 9
```

实测数量级差距：

```python
import time
big = list(range(1_000_000))           # 有序数据

t0 = time.perf_counter()
print(binary_search(big, 999_999))     # 999999
print(time.perf_counter() - t0)        # 约 0.00002 秒（最多 20 步）

t0 = time.perf_counter()
print(999_999 in big)                  # list 的 in 是线性查找 O(n)
print(time.perf_counter() - t0)        # 约 0.02 秒（最多 100 万步）
```

进阶变体「查找左边界」：目标可能重复时，命中不返回而是 `hi = mid - 1` 继续往左压，循环结束时 lo 落在第一个目标的位置——标准库 `bisect.bisect_left` 就是它。

## 常见坑

1. **坑 1：忘了有序前提**。对无序列表二分，结果「看似成功实则错误」。排查：用前确认有序，或先排序。
2. **坑 2：区间约定混用导致 off-by-one**。`hi = len(nums)`（右开）配 `lo <= hi` 会越界或漏查。排查：全套只用一种约定——闭区间配 `lo <= hi` 和 `mid ± 1`。
3. **坑 3：死循环**。某些写法用 `lo = mid`（而非 `mid + 1`）配 `(lo + hi) // 2`，剩两个元素时 mid 停在 lo 不动。排查：确保每轮区间**严格**缩小。

## 小练习

1. 把模板改成「查找左边界」：`[1, 2, 2, 2, 3]` 里查 2，应返回下标 1。
2. 手算：16 个元素最多几次比较？100 万个呢？（提示：log₂）
3. 思考题：为什么链表不能高效二分？（提示：链表能 O(1) 直达中间吗？）
