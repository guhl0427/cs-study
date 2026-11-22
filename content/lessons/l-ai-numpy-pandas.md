---
id: l-ai-numpy-pandas
slug: numpy-pandas
title: NumPy 与 pandas：数据的左膀右臂
difficulty: 2
estMinutes: 45
tags: [NumPy, pandas, 数据分析]
summary: NumPy 把数值计算提速上百倍，pandas 在它上面包了一层带标签的表格——两者是 Python 数据分析的地基。
updated: 2026-11-22
resources:
  - id: r-np-basics
    title: NumPy 官方教程 · the absolute basics for beginners
    url: https://numpy.org/doc/stable/user/absolute_beginners.html
    type: doc
    difficulty: 2
    note: 官方入门教程，图解 ndarray 的形状与轴。
  - id: r-pd-10min
    title: pandas 官方指南 · 10 minutes to pandas
    url: https://pandas.pydata.org/docs/user_guide/10min.html
    type: doc
    difficulty: 2
    note: 十分钟过一遍 DataFrame 核心操作，官方出品。
---

> 一句话定义：NumPy 提供超快的多维数组，pandas 提供带标签的表格——装好这两件，Python 才配叫数据分析语言。

## 概念讲解

**为什么不能只用 list？** list 的每个元素都是完整对象，散落在内存各处，求和得逐个取出来算。NumPy 的 `ndarray` 把数字连续排成一整块，运算交给底层 C 代码批量完成。同样对 1000 万个数求和，实测：Python 循环 0.75 秒，`np.sum` 只要 0.005 秒——**快 150 倍以上**。这种「一次算一整个数组」的写法叫**向量化**。

```text
Python list：  [对象][对象][对象][对象]  → 解释器逐个取值，慢
NumPy array：  [5|8|2|9|3|1|7|4]        → C 层一次性批量算，快
```

**pandas 的 DataFrame = 带标签的表格**，像一张自带列名、可编程的 Excel：

```text
CSV 文件
   │  pd.read_csv()
   ▼
┌────────── DataFrame ──────────┐
│        city  month  sales     │ ← 列名（列标签）
│   0    北京   10     820      │
│   1    北京   11     910      │ ← 行号（行索引）
│   ...                         │
└───────────────────────────────┘
   │  df.values                 （拿走纯数字部分）
   ▼
ndarray：只剩数字，没有标签
```

两者的关系：**pandas 底层就是 NumPy**，DataFrame 的每一列都是一个 ndarray。分工口诀——「**表用 pandas，数学用 NumPy**」：读文件、过滤、分组用 pandas；矩阵运算、喂给机器学习模型的纯数字用 NumPy。

## 代码示例

从 CSV 读数据到统计出结论的完整流程（先造文件再分析）：

```python
import pandas as pd

# 准备一份销售 CSV（真实场景里这文件通常是别人给你的）
df_source = pd.DataFrame({
    "city":  ["北京", "北京", "上海", "上海", "深圳", "深圳"],
    "month": [10, 11, 10, 11, 10, 11],
    "sales": [820, 910, 760, 950, 480, 700],
})
df_source.to_csv("sales.csv", index=False)

df = pd.read_csv("sales.csv")            # 1) 读入
print(df.head(2))                        # 看前两行长什么样
#   city  month  sales
# 0  北京     10    820
# 1  北京     11    910

print(df["sales"].mean())                # 2) 选列求均值 → 770.0
nov = df[df["month"] == 11]              # 3) 布尔过滤：只要 11 月
print(nov["sales"].sum())                # → 2560
print(df.groupby("city")["sales"].sum()) # 4) 按城市聚合
# city
# 上海    1710
# 北京    1730
# 深圳    1180
```

NumPy 侧的高频操作，四行看完：

```python
import numpy as np

a = np.array([1, 2, 3, 4])
print(a.shape)          # (4,)            形状
print(a * 10 + 1)       # [11 21 31 41]   向量化运算，不用写循环
print(a[a > 2])         # [3 4]           布尔索引，一行完成筛选
print(np.arange(6).reshape(2, 3).shape)   # (2, 3)   变形
```

## 常见坑

1. **坑 1：链式赋值不生效**。`df[df["month"] == 11]["sales"] = 0` 静默失败——pandas 在改一份副本，原表没动。过滤后赋值要一步到位：`df.loc[df["month"] == 11, "sales"] = 0`。看到 `SettingWithCopyWarning` 就要警惕。
2. **坑 2：for 循环逐行处理 DataFrame**。这等于把 NumPy 用回了 Python 慢速模式，百万行要跑几分钟。先想「这一列能不能整体乘/加/筛选」，向量化优先，实在不行再 `apply`。
3. **坑 3：NaN 会传染**。一列里只要有一个缺失值，`.mean()` 就返回 NaN。排查：`df.isna().sum()` 数每列缺几个，再决定 `dropna()` 删行还是 `fillna()` 补值。

## 小练习

1. 把示例改成「每个城市的平均销量」（groupby 后把 `sum` 换成 `mean`），上海应该是 855.0。
2. 用 `np.arange(1, 101)` 生成 1 到 100，一行筛出所有 3 的倍数（布尔索引）。
3. 思考题：`df["sales"] * 2` 不写循环就能整列翻倍，底层为什么能做到？（提示：回看 ndarray 的内存布局。）
