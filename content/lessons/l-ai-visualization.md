---
id: l-ai-visualization
slug: visualization
title: Matplotlib：把数据画出来
difficulty: 2
estMinutes: 35
tags: [Matplotlib, 可视化, 数据分析]
summary: 统计摘要会骗人，一张图不会——四类图各自回答一类问题，pandas 还能一行出图。
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
---

> 一句话定义：Matplotlib 是 Python 的画笔——表格里看不出的规律和异常，一张图一眼看穿。

## 概念讲解

**为什么必须会画图？** 统计摘要会骗人。经典的 Anscombe 四重奏：四组数据的均值、方差、相关系数几乎一模一样，画成散点图却是四种完全不同的形态——一条直线、一条弯线、一堆完美的点、一个离群点毁掉整条回归线。只看 `describe()` 的汇总数字，这些差异完全隐形。一图胜千言，不是修辞，是事实。

**选图口诀**——先问「我想回答什么问题」：

| 图型 | 回答的问题 | 例子 |
| ---- | ---- | ---- |
| 折线图 | 随时间怎么变（趋势） | 月度销量、气温走势 |
| 柱状图 | 类别之间谁多谁少（对比） | 各城市销量、各科平均分 |
| 散点图 | 两个数值有没有关系（相关） | 学习时长 vs 分数 |
| 直方图 | 数据分布：集中在哪、偏不偏 | 全班成绩、身高 |

看图的三个固定动作：**找异常值**（离大部队很远的点，往往是录入错误或真正的商机）、**看相关**（散点云整体朝右上=正相关，平铺无规律=没关系）、**看偏态**（直方图尾巴拖一边，均值会被极端值拉偏，这时中位数比均值诚实）。

## 代码示例

最小可用版本——五行出图：

```python
import matplotlib.pyplot as plt

plt.plot([10, 11, 12], [82, 91, 120], marker="o")  # 折线：看趋势
plt.title("Q4 sales")        # 标题与轴标签是礼貌，更是必需
plt.xlabel("month")          # 没有轴标签的图，别人看不懂单位
plt.ylabel("sales (10k)")
plt.show()
```

四种图一次集齐（`subplots` 一张画布画 2×2）：

```python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].plot([10, 11, 12], [82, 91, 120])              # 折线=趋势
axes[0, 1].bar(["北京", "上海", "深圳"], [173, 171, 118])  # 柱状=对比
axes[1, 0].scatter([1, 2, 3, 5, 8], [40, 45, 50, 65, 88]) # 散点=相关
axes[1, 1].hist([55, 60, 65, 70, 70, 75, 78, 90], bins=5) # 直方=分布
plt.show()
```

pandas 自带 `.plot()`，一行出图（底层就是 Matplotlib）：

```python
df["sales"].plot(kind="hist", bins=5)   # kind 换成 bar/line 也行
```

## 常见坑

1. **坑 1：中文显示成方块**。Matplotlib 默认字体不含中文。对策：`plt.rcParams["font.sans-serif"] = ["SimHei"]`；若负号变方块再加 `plt.rcParams["axes.unicode_minus"] = False`。
2. **坑 2：柱状图纵轴不从 0 开始**。178 和 172 看起来差一截，实际只差 3%——夸大差异的图会误导人。读别人的图也要先瞄一眼纵轴起点。
3. **坑 3：循环里忘清空画布**。循环里反复 `plt.plot()` 却不重建 figure，所有线叠在一张图上分不清。每次画前 `plt.figure()`，画完 `plt.show()` 或 `plt.clf()` 清场。

## 小练习

1. 用上一课的 `sales.csv` 画「各城市总销量」柱状图，加标题和轴标签。
2. 把四宫格示例改用 pandas 的 `.plot()` 重画其中两张。
3. 思考题：为什么「看散点图判断相关」比「只看相关系数」更可靠？（提示：Anscombe 四重奏。）
