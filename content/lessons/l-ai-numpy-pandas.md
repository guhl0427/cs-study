---
id: l-ai-numpy-pandas
slug: numpy-pandas
title: NumPy 与 pandas：数据的左膀右臂
difficulty: 2
estMinutes: 85
tags: [NumPy, pandas, 数据分析]
summary: 从「为什么 list 慢上百倍」讲到 groupby/merge 一行出答案——跟着一份销售 CSV 做完整分析，亲手回答 5 个真实业务问题。
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
  - id: r-pd-book
    title: 利用 Python 进行数据分析（Python for Data Analysis）
    url: https://wesmckinney.com/book/
    type: book
    difficulty: 2
    note: pandas 作者 Wes McKinney 亲写的经典书，官网免费在线阅读。
---

> 一句话定义：NumPy 把数字排成连续内存并用 C 批量运算（快），pandas 在它之上包一层带标签的表格（好用）——装好这两件，Python 才配叫数据分析语言。

## 概念讲解

### 为什么弃 list 用 ndarray：内存布局决定一切

Python 的 list 里存的不是数字本身，而是一个个**完整对象**的地址：每个整数都带着引用计数、类型信息，散落在内存各处，求和时解释器必须逐个「取地址 → 解引用 → 取值 → 加」。NumPy 的 `ndarray` 则把数字**连续紧凑**地排成一整块（同一类型、定长字节），再配上一条铁律——整块交给底层 C 循环批量算：

```text
Python list:  [指针][指针][指针][指针]  → 指向散落各处的对象
                     ↓ 每个元素都要解引用，慢
NumPy array:  [5|8|2|9|3|1|7|4]        → 一整块连续内存
                     ↓ 整块下沉到 C 层批量算，快
```

**实测对比**（把这段直接跑一遍）：

```python
import time, numpy as np
n = 10_000_000
xs = list(range(n)); t0 = time.perf_counter(); s1 = sum(xs); t1 = time.perf_counter()
s2 = np.arange(n).sum(); t2 = time.perf_counter()
print(f"list  循环: {t1-t0:.3f}s")   # 参考输出: 0.412s（倍数才是重点，机器不同差异大）
print(f"ndarray    : {t2-t1:.4f}s")  # 参考输出: 0.0083s → 快约 50 倍以上
```

这种「一次写一整个数组的运算，不写 for 循环」的风格叫**向量化（vectorization）**。它不只是快：没有循环变量、没有越界错误，代码也更短，更接近数学表达 `y = 2 * x + 1`。

### ndarray 三件套：创建、shape、切片

创建最常用的四个入口：

| 写法 | 得到什么 | 例子 |
| ---- | ---- | ---- |
| `np.array([1, 2, 3])` | 把 list 变成数组 | `[1 2 3]` |
| `np.arange(6)` | 等差序列（像 range） | `[0 1 2 3 4 5]` |
| `np.zeros((2, 3))` / `np.linspace(0, 1, 5)` | 全 0 占位 / 等间隔取点 | 2 行 3 列 / `[0 0.25 0.5 0.75 1]` |

每个 ndarray 都有 **shape（形状）**：`(12,)` 是 12 个数的一维，`(3, 4)` 是 3 行 4 列；`reshape` 只改「怎么看」这串数字，不动数据本身：

```text
a = [1 2 3 4 5 6 7 8 9 10 11 12]   shape (12,)
        reshape(3, 4) ↓
[[ 1  2  3  4]
 [ 5  6  7  8]                        shape (3, 4)
 [ 9 10 11 12]]                       内存里还是同一串数
```

切片语法和 list 相同，但可以直接切出**任意一块区域**：`m[:, 1]` 是「所有行、第 1 列」，`m[0:2, :]` 是前两行；切片返回的是原数据的**视图**——改切片会改原数组（省内存的设计，也是坑，见后文）。
### 布尔索引：一行筛完整个数组

对数组做比较，得到的不是 True/False，而是一个**同形状的布尔掩码**；把掩码塞进方括号当下标，一步筛出所有满足条件的元素：

```text
a       = [5, 12, 8, 20, 3]
a > 10  →  [False, True, False, True, False]   ← 掩码（对照原位置）
a[a>10] →  [12, 20]                            ← 只留 True 对应的元素
```

list 要写「循环 + if + append」三行的活，ndarray 一行做完——这就是向量化筛选。

### pandas：DataFrame = 带标签的表格

DataFrame 像一张**可编程的 Excel**：有列名（列标签）、有行索引，读 CSV 只要一行：

```text
sales.csv
   │  pd.read_csv("sales.csv")
   ▼
┌────────────── DataFrame ──────────────┐
│        city  month  qty  price        │ ← 列名（column 标签）
│   0    北京     10   82    10         │ ← 行索引（index）
└───────────────────────────────────────┘
   每一列单独拿出来是一个 Series（带标签的一列数）
```

把日常 Excel 动作翻译成 pandas 方法，一目了然：

| Excel 里你做的事 | pandas 里的一行 |
| ---- | ---- |
| 点选某一列 | `df["sales"]`（或 `df.loc[:, "sales"]`） |
| 按条件筛行 | `df[df["month"] == 11]` |
| 数据透视表（分组求和） | `df.groupby("city")["sales"].sum()` |
| VLOOKUP 关联另一张表 / 排序 | `df.merge(info, on="city")` / `df.sort_values("sales", ascending=False)` |

取数有两条通道，初学最容易混：**`loc` 按标签**（行索引值、列名），**`iloc` 按位置**（第几行、第几列）。行索引默认是 0,1,2… 时两者常重合，但索引一旦被改动（如筛选后）就会分道扬镳——口诀「**loc 认名字，iloc 认座位号**」。

### 分工心法：表用 pandas，数学用 NumPy

pandas 底层就是 NumPy——DataFrame 的每一列都是一个 ndarray，所以 pandas 才又快又省内存。分工一览：**读 CSV / 选列 / 过滤 / groupby / merge 用 pandas**（面向「表」）；**矩阵运算 / reshape / 广播用 NumPy**（面向「数组」）；机器学习建模时用 `df.values` 把表格变回纯数字矩阵喂给模型（下一章）。

心法一句话：**跟文件、跟报表打交道用 pandas；进入纯数字计算用 NumPy**。日常分析九成时间在 pandas 里，但看懂 NumPy 才明白 pandas 为什么快。

## 代码示例

主线任务：拿到一份 4 城市 × 3 个月的销售流水 `sales.csv`，从读文件开始回答 **5 个真实业务问题**，每问一段独立代码 + 预期输出，跑完你就有一个可复用的分析模板。全程约 30 分钟。

### 第 0 步：造数据、读文件、先「看一眼」

```python
import pandas as pd

# 真实场景里这文件通常是别人给你的；这里先造出来保证示例可跑
df_source = pd.DataFrame({
    "city":  ["北京", "北京", "北京", "上海", "上海", "上海",
              "深圳", "深圳", "深圳", "杭州", "杭州", "杭州"],
    "month": [10, 11, 12, 10, 11, 12, 10, 11, 12, 10, 11, 12],
    "qty":   [82, 91, 105, 76, 95, 88, 48, 70, 66, 32, 41, 39],
    "price": [10, 10, 10, 10, 10, 11, 10, 11, 11, 10, 10, 11],
})
df_source.to_csv("sales.csv", index=False, encoding="utf-8-sig")
df = pd.read_csv("sales.csv")     # 读文件只要一行
print(df.head(3))                 # 先看前 3 行长什么样（永远第一步）
print(df.shape)                   # (12, 4)：12 行 4 列
#    city  month  qty  price
# 0  北京     10   82     10
# 1  北京     11   91     10
# 2  北京     12  105     10
```

### 预备：向量化的「整列相乘」造出销售额列

```python
df["sales"] = df["qty"] * df["price"]    # 两列直接相乘，一行算 12 行
print(df[["city", "month", "sales"]].head(3))
#    city  month  sales
# 0  北京     10    820
# 1  北京     11    910
# 2  北京     12   1050
```

### 问题 1：每个城市的总销量是多少？（groupby 聚合）

```python
city_sales = df.groupby("city")["sales"].sum().sort_values(ascending=False)
print(city_sales)
# city
# 北京    2780
# 上海    2678
# 深圳    1976
# 杭州    1159
# Name: sales, dtype: int64
```

`groupby("city")` 把 12 行按城市分成 4 组，`["sales"].sum()` 对每组的 sales 列求和——正是 Excel 数据透视表的一行版。

### 问题 2：哪个月卖得最好？增长有没有放缓？

```python
month_sales = df.groupby("month")["sales"].sum()
print(month_sales)
# month
# 10    2380
# 11    3040
# 12    3173
print(round((month_sales[11] - month_sales[10]) / month_sales[10] * 100, 1),   # 27.7  11月环比
      round((month_sales[12] - month_sales[11]) / month_sales[11] * 100, 1))   # 4.4   12月环比
```

读数：11 月放量（环比 +27.7%），12 月冲到 3173 但增速放缓到 +4.4%——「总量还在涨，动力在衰减」是老板关心的话。

### 问题 3：哪些订单高于全部订单的平均值？（布尔过滤）

```python
print(round(df["sales"].mean(), 2))              # 716.08  全体订单均值
above = df[df["sales"] > df["sales"].mean()]     # 布尔掩码筛行
print(len(above))                                # 8       共 8 笔高于均值
print(above["city"].value_counts())              # 按城市数一数
# 北京    3
# 上海    3
# 深圳    2
# Name: count, dtype: int64
```

和 NumPy 的布尔索引完全同构：`df[条件]` 留下 True 的行。杭州一笔都没上平均线——它整体偏低，后面按大区看更清楚。

### 问题 4：每个城市自己的最佳月份是哪个月？

```python
best = df.sort_values("sales", ascending=False).groupby("city").head(1)
print(best[["city", "month", "sales"]])
#    city  month  sales
# 2  北京     12   1050
# 5  上海     12    968
# 7  深圳     11    770
# 11 杭州     12    429
```

先整体降序排，再每组取第一个——「组内 Top1」的经典写法。北京、上海、杭州都是 12 月冲顶，深圳却是 11 月（12 月回落到 726），值得单独看一眼。

### 问题 5：merge 关联城市表，按大区汇总（merge 一句）

```python
city_info = pd.DataFrame({"city": ["北京", "上海", "深圳", "杭州"],
                          "region": ["华北", "华东", "华南", "华东"]})  # 杭州属华东
merged = df.merge(city_info, on="city")     # 相当于 VLOOKUP：按 city 关联补列
print(merged.groupby("region")["sales"].sum().sort_values(ascending=False))
# region
# 华东    3837
# 华北    2780
# 华南    1976
```

华东 = 上海 2678 + 杭州 1159 = 3837——单看城市排第 2 的上海，加上杭州后大区跃居第 1。**merge 把两张表变一张，groupby 把一张表变一个结论**，这两招就是表格分析的主干。

### NumPy 速通：shape、切片、布尔索引

```python
import numpy as np
a = np.arange(1, 13)          # [ 1  2  3  4  5  6  7  8  9 10 11 12]
print(a.shape)                # (12,)
m = a.reshape(3, 4); print(m)
# [[ 1  2  3  4]
#  [ 5  6  7  8]
#  [ 9 10 11 12]]
print(m[:, 1])                # [ 2  6 10]   所有行、第 1 列
print(a[a % 3 == 0])          # [ 3  6  9 12]  布尔索引筛倍数
print(m[m > 8].sum())         # 42            9+10+11+12（二维布尔索引）
print(df.values.shape)        # (12, 5)  表格变回纯数字矩阵，随时可喂给模型
```

### loc / iloc：两条取数通道对照

```python
print(df.loc[0, "city"])      # 北京 —— loc 按标签：行索引值 0、列名 city
print(df.iloc[0, 0])          # 北京 —— iloc 按位置：第 0 行第 0 列
print(df.loc[df["city"] == "深圳", "sales"].tolist())   # [480, 770, 726]
```

筛行 + 选列一步到位的标准姿势是 `df.loc[条件, 列名]`，它也是**安全赋值**的唯一通道（见坑 1）。

## 常见坑

1. **坑 1：链式赋值不生效**。现象：`df[df["month"] == 11]["sales"] = 0` 跑完原表没变，还弹 `SettingWithCopyWarning`。原因：这条链先执行 `df[...]` 取出一份**副本**，赋值改的是副本。排查/解法：一步到位 `df.loc[df["month"] == 11, "sales"] = 0`；看到警告立即检查。
2. **坑 2：for 循环逐行处理 DataFrame**。现象：几万行的处理脚本越跑越慢。原因：逐行循环把向量化退化成了 Python 慢速模式。排查：凡是「对整列做同一件事」，先想乘除/比较/groupby 能否一行解决，其次 `apply`，最后才轮到 for。
3. **坑 3：NaN 会传染**。现象：`.mean()`、`.sum()` 突然返回 NaN。原因：一列里有缺失值，均值整列变 NaN。排查：`df.isna().sum()` 数每列缺几个，再选 `dropna()` 删行或 `fillna()` 补值。
4. **坑 4：loc 与 iloc 用混**。现象：筛选后取数拿到意外行，或报 `KeyError`。原因：筛选后行索引不再连续，`df.loc[0]` 找的是「索引值为 0」而不是「第 0 行」。排查：拿不准先 `df.reset_index(drop=True)`，或明确用 `iloc` 按座位号取。
5. **坑 5：groupby 结果成了「没有名字的列」**。现象：想再 merge 或保存，却发现城市列变成了行索引。原因：`groupby(...).sum()` 默认把分组键放到 index。解法：`reset_index()` 把它变回普通列，或 `groupby(..., as_index=False)`。
6. **坑 6：读 CSV 中文乱码**。现象：中文列名变成火星文或报 `UnicodeDecodeError`。原因：Windows 导出的 CSV 常是 GBK 编码。排查：`pd.read_csv(path, encoding="gbk")` 试一遍；自己写文件时用 `encoding="utf-8-sig"`（Excel 打开也不乱码）。

## 小练习

1. 把问题 1 改成「每个城市的**平均**销量」（`sum` 换 `mean`），上海应为 892.67；想一想：深圳的平均（658.67）比杭州（386.33）高得多，为什么总销量排名深圳第 3、杭州第 4 依然合理？（提示：每组行数相同，比较的是总量结构。）
2. 用 `np.arange(1, 101)` 生成 1 到 100，一行筛出所有 3 的倍数并求和（应为 1683）。
3. 给问题 2 的月度表加一列「环比增长率」，提示：`pct_change()` 可以一行算出来。
4. **综合任务**：基于 merge 后的表回答三个问题——每个大区的平均单价（`groupby("region").apply(lambda g: g["sales"].sum() / g["qty"].sum())`）；总销量最高的单笔订单来自哪个大区；用 `pivot_table` 把「大区 × 月份」的总销量透视成二维表。跑通后，你就完成了一次从原始 CSV 到多结论汇报的完整分析。
