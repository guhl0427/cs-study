---
id: l-dsa-recursion
slug: recursion
title: 递归
difficulty: 2
estMinutes: 35
tags: [算法, 递归]
summary: 递归 = 函数调用自己——基线条件当刹车，递归条件缩小问题，树形问题天然适合它。
updated: 2026-11-22
resources:
  - id: r-rec-tutor
    title: Python Tutor
    url: https://pythontutor.com/
    type: tool
    difficulty: 1
    note: 可视化调用栈展开与回溯，学递归必备。
  - id: r-rec-book
    title: 《算法图解》第 3 章
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 用「盒子里的钥匙」讲递归，最友好的入门。
  - id: r-rec-cache
    title: Python 官方文档 · functools.lru_cache
    url: https://docs.python.org/zh-cn/3/library/functools.html#functools.lru_cache
    type: doc
    difficulty: 2
    note: 记忆化装饰器的官方文档。
---

> 一句话定义：递归是函数调用自己——把大问题拆成同款小问题，靠「基线条件」刹车，靠「递归条件」缩圈。

## 概念讲解

递归像排队问前面的人「我排第几」：每个人把问题抛给前一位，答案再一层层传回来。写递归必须回答两个问题：

- **基线条件（base case）**：什么时候停？——刹车。没有它，函数会一直调自己直到崩。
- **递归条件（recursive case）**：怎么把问题变小？——每次调用都要**更接近**刹车。

以阶乘为例（n! = n × (n-1) × … × 1）：

```
factorial(4)
= 4 * factorial(3)          ← 递归条件：缩小问题
= 4 * 3 * factorial(2)
= 4 * 3 * 2 * factorial(1)
= 4 * 3 * 2 * 1             ← 基线条件：n <= 1 直接返回
```

每次函数调用都会在**调用栈**压一层「现场」（参数、局部变量、执行到哪了）：递归展开时栈越压越深，命中基线后逐层弹栈回溯——Python Tutor 能一步步看到这个过程。

代价：每层调用都占栈空间（深度 n 的递归 = O(n) 空间），太深就**栈溢出**。Python 默认递归深度约 1000 层，超了抛 `RecursionError`——这是语言级保护，比 C 直接崩溃友好。

## 代码示例

```python
def factorial(n):
    if n <= 1:                    # 基线条件：刹车
        return 1
    return n * factorial(n - 1)   # 递归条件：问题缩小一步

print(factorial(4))               # 24
print(factorial(100))             # 93326215443944152681...（大整数也没问题）
```

裸递归斐波那契会**重复计算**同一子问题——看递归树，fib(3) 被算了两遍：

```
                fib(5)
             /        \
         fib(4)        fib(3)          ← 左边还会再算一次 fib(3)
        /     \        /    \
    fib(3)  fib(2)  fib(2)  fib(1)
```

```python
from functools import lru_cache

def fib_slow(n):
    if n <= 1:
        return n
    return fib_slow(n - 1) + fib_slow(n - 2)   # O(2^n)：指数爆炸

@lru_cache(maxsize=None)     # 记忆化：算过的直接查表
def fib_fast(n):
    if n <= 1:
        return n
    return fib_fast(n - 1) + fib_fast(n - 2)   # O(n)：每个子问题只算一次

# print(fib_slow(35))         # 要等好几秒
print(fib_fast(35))           # 9227465，瞬间出结果
```

选型：循环能写清楚的就别递归（阶乘、求和）；结构天然是树形/嵌套的（目录遍历、JSON 解析、树的遍历），递归反而更清晰。

## 常见坑

1. **坑 1：缺基线条件（或够不到）**。现象：`RecursionError: maximum recursion depth exceeded`。排查：先问「哪次调用第一次不调用自己？」，参数必须每次朝它靠近。
2. **坑 2：裸递归斐波那契以为「电脑慢」**。O(2^n) 的重复计算，n=35 就要几十秒。排查：画递归树找重复子问题，套 `@lru_cache`。
3. **坑 3：以为递归更高级**。递归有栈开销和深度限制；阶乘用循环更快更稳。递归的价值在树形结构，不在炫技。

## 小练习

1. 写递归函数 `sum_digits(n)` 求各位数字之和：`sum_digits(1234)` → 10。
2. 在 Python Tutor 里跑 `factorial(4)`，观察调用栈压入与弹出的顺序。
3. 思考题：`def f(n): return f(n - 1)` 缺了两个要素中的哪个？后果是什么？
