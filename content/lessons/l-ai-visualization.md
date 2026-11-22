---
id: l-ai-visualization
slug: visualization
title: Matplotlib：把数据画出来
difficulty: 2
estMinutes: 75
tags: [Matplotlib, 可视化, 数据分析]
summary: Anscombe 四重奏证明统计摘要会骗人；四类图选型表 + 看图三动作，同一份销售数据画四张图逐张解读。
updated: 2026-11-22
resources:
  - id: r-plt-pyplot
    title: Matplotlib 官方教程 · Pyplot tutorial
    url: https://matplotlib.org/stable/tutorials/pyplot.html
    type: doc
    difficulty: 2
    note: 官方 pyplot 入门，看完就能画基本图。
  - id: r-plt-gallery
    title: Matplotlib 官方图库（Gallery）
    url: https://matplotlib.org/stable/gallery/index.html
    type: tool
    difficulty: 3
    note: 想画什么先来这找样图，抄官方代码改数据。
  - id: r-plt-pandas
    title: pandas 官方指南 · Visualization
    url: https://pandas.pydata.org/docs/user_guide/visualization.html
    type: doc
    difficulty: 2
    note: DataFrame.plot() 全部 kind 与参数的官方参考。
---

> 一句话定义：Matplotlib 是 Python 的画笔——表格里看不出的规律和异常，一张图一眼看穿；统计摘要会骗人，图不会。

## 概念讲解

### 为什么必须画图：统计摘要会骗人

1973 年统计学家 Anscombe 构造了著名的**四重奏**：四组数据（每组 11 个点）的统计摘要几乎完全一致——x 均值都是 9.0，y 均值都约 7.5，方差都是 11，相关系数都是 0.816，回归线都是 `y = 3 + 0.5x`。只看 `describe()`，你会认为它们是同一份数据。画成散点图却是四种完全不同的形态：

```text
数据 I:  ·  · ↑· ·   规整的直线带：回归线描述得很好
数据 II:     ╭─╮     一条弧线：该拟合曲线，不是直线
数据 III: ·──·↗    ·  完美直线 + 一个离群点把回归线拽斜
数据 IV:  ¦   ↗·    x 几乎全相同，一个离群点撑起全部"相关"
```

结论：**均值、相关系数这类摘要会抹掉形态信息，画图是唯一可靠的体检**。这就是「一图胜千言」的统计学出处——不是修辞，是被证明过的骗局防线。

### 四类图选型表：先问「我想回答什么问题」

| 图型 | 回答什么问题 | 数据长什么样 | 怎么读 |
| ---- | ---- | ---- | ---- |
| 折线图 | 一个量随时间/顺序怎么变 | 按月、按日的序列 | 看走向与斜率：升、降、放缓、拐点 |
| 柱状图 | 类别之间谁多谁少 | 离散类别各对应一个数 | 比柱高；先瞄纵轴是不是从 0 开始 |
| 散点图 | 两个数值量有没有关系 | 每行数据贡献一个 (x, y) 点 | 看点云走向与疏密，找离群点 |
| 直方图 | 一个量的分布：集中在哪、偏不偏 | 单列数值自动分桶计数 | 看峰在哪、尾巴拖向哪、有无空档 |

反着记也成立：**要趋势用折线、要比多少用柱状、要关系用散点、要分布用直方图**。选错图型比画错数据更常见——拿直方图去比较类别，就是拿锤子拧螺丝。

### 最小礼节模板：标题、轴标签、网格

没有标题和轴标签的图，三天后连你自己都看不懂单位。最小礼节五件套：

```python
import matplotlib.pyplot as plt

plt.plot([10, 11, 12], [2380, 3040, 3173], marker="o")
plt.title("月度总销量（万元）")     # ① 标题：图回答的问题
plt.xlabel("月份")                 # ② x 轴含义
plt.ylabel("销量（万元）")          # ③ y 轴含义 + 单位
plt.grid(axis="y", alpha=0.3)      # ④ 浅网格：方便估读数值
plt.show()                         # ⑤ 展示
```

这是一切图的骨架——后面四张图都长在这副骨架上。

### pandas 的 .plot()：一行出图

DataFrame/Series 自带 `.plot(kind=...)`，底层就是 Matplotlib，一行完成「聚合 + 画图」：

| kind 值 | 画什么 |
| ---- | ---- |
| `"line"` | 折线（默认） |
| `"bar"` / `"barh"` | 竖柱 / 横柱 |
| `"scatter"` | 散点（需指定 x、y 列） |
| `"hist"` | 直方图 |

`df.groupby("month")["sales"].sum().plot(kind="bar")` 一行就是一张「每月销量」柱状图。快速探索用它；要精细排版再用 Matplotlib 原生接口。

### 看图三动作：异常值、相关性、偏态

拿到任何一张图，按固定顺序做三个动作：

1. **找异常值**：离大部队很远的点。可能是录入错误（某个订单量 4800，其实多打了两个 0），也可能是真正的商机或风险。纪律是**先核实再处理**——查原始记录，决定修正、保留还是剔除，而不是直接删。
2. **看相关性**：散点云整体走向。朝右上=正相关（一起涨），朝右下=负相关，平铺无规律=没关系。两个警告：相关≠因果（冰淇淋销量和溺水人数同涨，因为夏天）；离群点会把弱相关描成强相关。
3. **看偏态**：直方图的尾巴拖向哪边。尾巴在右，少数大值把均值拉高（平均收入远高于「典型」收入）；尾巴在左，均值被拉低。**偏态存在时，中位数比均值更能代表典型水平**——判断依据：均值和中位数明显不等就是信号。

### 子图布局：一张画布放四张图

```text
fig, axes = plt.subplots(2, 2, figsize=(10, 8))   ← 2 行 2 列的「相册」
┌────────────┬────────────┐
│ axes[0,0]  │ axes[1,0]  │  注意：axes 按 [行, 列] 索引
├────────────┼────────────┤     第 0 行是上面一行
│ axes[0,1]  │ axes[1,1]  │
└────────────┴────────────┘
```

`axes` 是一个 2×2 数组，用 `axes[0, 0].bar(...)` 指定画在哪个格子。四张相关联的图放一起，对比效率远高于四张分散的图。

## 代码示例

主线任务：继续用上一课的 `sales.csv`（没有就重跑上一课第 0 步），**同一份数据画四张图、逐张解读**。你要亲眼看到：数字表格里完全看不见的两件事——「杭州是一个单独的群体」和「12 月动力衰减」。全程约 25 分钟。

### 第 0 步：中文显示 + 读数据 + 聚合出四组量

```python
import pandas as pd
import matplotlib.pyplot as plt

# 中文显示三件套（Windows: SimHei；macOS 可换 PingFang SC；Linux 可换 Noto Sans CJK SC）
plt.rcParams["font.sans-serif"] = ["SimHei"]
plt.rcParams["axes.unicode_minus"] = False   # 负号也用中文字体渲染，防方块

df = pd.read_csv("sales.csv")
df["sales"] = df["qty"] * df["price"]
month_sales = df.groupby("month")["sales"].sum()   # 折线用：10→2380 11→3040 12→3173
city_sales  = df.groupby("city")["sales"].sum()    # 柱状用：北京 2780 上海 2678 深圳 1976 杭州 1159
```

### 图 1：折线图——月度趋势

```python
plt.plot(month_sales.index, month_sales.values, marker="o", color="tab:blue")
plt.title("月度总销量：11 月放量，12 月增速放缓")
plt.xlabel("月份")
plt.ylabel("销量（元）")
plt.grid(axis="y", alpha=0.3)
plt.show()
```

解读：曲线整体向上，但**斜率变了**——10→11 月大涨 +27.7%，11→12 月只涨 +4.4%。折线图的价值就在「斜率」：总量还在涨，动力在衰减，这从三个数字里不易一眼看出，在图上一眼可见。

### 图 2：柱状图——城市对比

```python
plt.bar(city_sales.index, city_sales.values, color="tab:orange")
plt.title("各城市总销量对比")
plt.xlabel("城市")
plt.ylabel("销量（元）")
plt.show()
```

解读：北京 2780 与上海 2678 视觉上差一截吗？若纵轴从 2600 起画，差距会被放大成「一倍」的错觉——实际只差 3.8%。**柱状图永远从 0 开始画**（Matplotlib 默认就是 0，别手贱改 ylim）；看别人的图也先瞄一眼纵轴起点。杭州 1159 明显垫底，引出下一张图。

### 图 3：散点图——销量由什么驱动？

```python
plt.scatter(df["qty"], df["sales"], color="tab:green")
plt.title("订单量 vs 销售额：强正相关")
plt.xlabel("数量（件）")
plt.ylabel("销售额（元）")
plt.grid(alpha=0.2)
plt.show()
```

解读：点云沿右上方向**紧密排成一条窄带**——销售额几乎由数量决定（sales = qty × price），价格从 10 涨到 11 只让点轻微散开。若你在自己的数据里看到平铺的点云，说明这两个量没关系，别硬编故事。

### 图 4：直方图——订单额的分布

```python
plt.hist(df["sales"], bins=6, color="tab:red", edgecolor="white")
plt.title("订单销售额分布：左侧长尾 + 空档")
plt.xlabel("销售额（元）")
plt.ylabel("订单笔数")
plt.show()
```

解读（bins=6 时每桶计数为 `[3, 1, 0, 3, 2, 3]`）：大部分订单挤在右侧 685–1050 区间，左侧 320–480 拖着一条尾巴，**中间 563–685 甚至空档**（0 笔）。这是看图三动作的实战：① 空档+低值簇 → 一查发现全是杭州的订单，「杭州是另一个群体」在表格里毫无痕迹，图上无所遁形；② 偏态 → 尾巴在左，均值 716.08 被拖得低于中位数 765——汇报时说「典型订单约 765 元」比说「平均 716 元」更诚实。

### 合体：2×2 四宫格

```python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].plot(month_sales.index, month_sales.values, marker="o")
axes[0, 0].set_title("趋势（折线）")
axes[0, 1].bar(city_sales.index, city_sales.values)
axes[0, 1].set_title("对比（柱状）")
axes[1, 0].scatter(df["qty"], df["sales"])
axes[1, 0].set_title("相关（散点）")
axes[1, 1].hist(df["sales"], bins=6, edgecolor="white")
axes[1, 1].set_title("分布（直方）")
fig.suptitle("sales.csv 四视图", fontsize=14)
plt.tight_layout()          # 自动挤开间距，防标题互相重叠
plt.show()
```

注意子图对象的画法：不再是 `plt.title` 而是 `axes[0, 0].set_title`—— pyplot 全局式适合快速单图，多图时用 `axes` 数组逐格操作，互不污染。

### pandas 一行版：快速探索

```python
df.groupby("city")["sales"].sum().plot(kind="bar", title="各城市总销量")
df["sales"].plot(kind="hist", bins=6, title="订单额分布")
df.plot(kind="scatter", x="qty", y="sales", title="数量 vs 销售额")
```

探索阶段用 `.plot()` 一行流；图定型了再用完整模板补标题、轴标签、网格。礼节可以迟到，但不能缺席。

## 常见坑

1. **坑 1：中文显示成方块**。现象：标题和轴标签全是空心方框。原因：Matplotlib 默认 DejaVu Sans 字体不含中文。排查：绘图前设 `plt.rcParams["font.sans-serif"] = ["SimHei"]`（macOS/Linux 换成系统有的中文字体），负号异常再加 `axes.unicode_minus = False`。
2. **坑 2：柱状图纵轴不从 0 开始**。现象：两张柱子看起来差一倍，实际差 3%。原因：曾被手动 `plt.ylim(2600, 3000)` 或导入工具默认截断。排查：画柱状图前检查 ylim；读别人的图第一眼看纵轴起点。
3. **坑 3：直方图与柱状图用混**。现象：把直方图当柱状图比较类别，或给类别数据画 hist。原因：直方图是「单列数值分桶计数」，横轴是数值区间；柱状图是「类别各一根柱」。排查：横轴是连续数值→直方图；横轴是离散类别→柱状图。
4. **坑 4：bins 拍脑袋导致形态误判**。现象：同一份数据 bins=5 和 bins=30 画出的形状完全不同，结论来回翻。原因：分桶数改变颗粒度。排查：从默认值开始，逐步加减 bins 看形态是否稳定；样本少于几十个时 bins 别太大，否则全是稀疏孤柱。
5. **坑 5：循环里反复叠加不清场**。现象：for 循环画多张图，所有线挤在同一张里。原因：pyplot 是全局状态，`plot()` 一直往当前 figure 上叠。排查：每次迭代用 `plt.figure()` 新开画布，或改用 `subplots` 布局逐格画；临时试验后 `plt.clf()` 清场。
6. **坑 6：脚本跑完图一闪而过或不出现**。现象：Jupyter 里能看到图，写成 .py 脚本却没反应。原因：脚本模式必须显式 `plt.show()`，它阻塞到窗口关闭；忘写则图对象只存在于内存。排查：脚本末尾补 `plt.show()`；批量存图用 `plt.savefig("x.png", dpi=150)` 再 `plt.close()`。

## 小练习

1. 画「每个城市**平均**订单额」的柱状图（用 `groupby().mean()`），并回答：均值排序和总量排序一致吗？谁被杭州拖累了？
2. 把直方图的 bins 从 6 改成 3 和 12 各画一次，描述形态变化——多少桶时「杭州群体」最显眼？
3. 用 Anscombe 四重奏数据（`seaborn` 或网上直接复制 11 对坐标）画四张散点图，核对它们的 `describe()`——亲手验证「摘要相同、形态不同」。
4. **综合任务**：为上一课的 merge 结果（含大区列）产出一张汇报图集：2×1 子图——上图按大区汇总总销量柱状图，下图按大区画订单额直方图；标题、轴标签齐全；写 3 句「图上能看到、表上看不到」的结论。这份图集就是一次完整的数据汇报。
