---
id: l-py-syntax
slug: py-syntax
title: Python 语法速览：变量、控制流与函数
difficulty: 1
estMinutes: 40
tags: [Python, 入门]
summary: 缩进即结构、变量无需声明类型、函数用 def——三件事撑起 Python 的全部骨架。
updated: 2026-11-22
resources:
  - id: r-py-doc
    title: Python 官方教程（中文）
    url: https://docs.python.org/zh-cn/3/tutorial/
    type: doc
    difficulty: 1
    note: 官方入门教程，比大部分第三方教程准确。
  - id: r-py-repl
    title: Python 在线运行（Python Tutor）
    url: https://pythontutor.com/
    type: tool
    difficulty: 1
    note: 逐行可视化执行过程，理解变量与循环的利器。
---

> 一句话定义：Python 用**缩进**表达代码结构，用**动态类型**省掉声明，是反馈最快的第一门语言。

## 概念讲解

三分钟记住 Python 的骨架：

**变量**——直接赋值，不写类型：

```python
name = "小明"        # 字符串
age = 18             # 整数
scores = [92, 88]    # 列表
```

**控制流**——冒号 + 缩进就是代码块（没有大括号）：

```python
if age >= 18:
    print("成年")
elif age >= 12:
    print("青少年")
else:
    print("儿童")

for score in scores:      # 遍历列表
    print(score)

count = 0
while count < 3:          # 条件循环
    count += 1
```

**函数**——`def` 定义，`return` 返回：

```python
def average(numbers):
    """计算平均值（这行字符串叫 docstring，是函数说明书）"""
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

print(average([92, 88]))   # 90.0
```

Python 之禅的核心是**可读性**：`sum()`、`len()` 这些内置函数让代码接近自然语言。遇到「这个操作有没有现成的」时，先查内置函数列表再自己造轮子。

## 代码示例

把三样东西拼成一个完整小程序（保存为 `grade.py` 运行 `python grade.py`）：

```python
def grade(score):
    """把百分制成绩换成等级"""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 60:
        return "C"
    return "F"

students = [("小明", 92), ("小红", 75), ("小刚", 58)]

for name, score in students:
    print(f"{name}: {score} 分 → {grade(score)}")
```

运行结果：

```text
小明: 92 分 → A
小红: 75 分 → C
小刚: 58 分 → F
```

注意两处语法糖：元组解包 `for name, score in students`；f-string `f"{name}"` 把变量直接嵌进字符串——现代 Python 的字符串拼接标准。

## 常见坑

1. **坑 1：缩进混用空格和 Tab**。Python 把缩进当语法，混用直接 `IndentationError`。对策：编辑器设成「Tab 自动转 4 空格」（VS Code 默认如此）。
2. **坑 2：`=` 是赋值，`==` 才是比较**。`if x = 5` 直接语法报错——比 C 语言友好，报错即定位。
3. **坑 3：整数除法的期待**。`10 / 3` 得 `3.333...`（真除法），要整除用 `10 // 3` 得 `3`；求余 `%`。这三个运算符的区别要在第一周就想清楚。

## 小练习

1. 写函数 `is_even(n)` 判断奇偶，用 4 个数字验证。
2. 用 for 循环打印九九乘法表的前三行（嵌套循环）。
3. 在 Python Tutor 里逐行跑一遍示例程序，观察变量面板的变化。
