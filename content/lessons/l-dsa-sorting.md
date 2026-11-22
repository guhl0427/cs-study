---
id: l-dsa-sorting
slug: sorting
title: 常见排序算法
difficulty: 2
estMinutes: 45
tags: [算法, 排序]
summary: 排序是算法思维的最佳练习场——冒泡直观、归并分治、快排原地，日常直接用内置的 Timsort。
updated: 2026-11-22
resources:
  - id: r-sort-visualgo
    title: VisuAlgo · 排序可视化
    url: https://visualgo.net/zh/sorting
    type: tool
    difficulty: 2
    note: 十几种排序的逐帧动画，看懂比背代码快。
  - id: r-sort-py
    title: Python 官方文档 · Sorting HOW TO
    url: https://docs.python.org/zh-cn/3/howto/sorting.html
    type: doc
    difficulty: 1
    note: sorted 与 sort 的权威用法（含 key 技巧）。
  - id: r-sort-toptal
    title: Sorting Algorithms Animations（Toptal）
    url: https://www.toptal.com/developers/sorting-algorithms
    type: tool
    difficulty: 2
    note: 不同数据分布下各算法的动态对比。
---

> 一句话定义：排序算法把无序数据排成有序——它是理解分治、稳定性、原地操作这些概念的教科书。

## 概念讲解

**冒泡排序**最直观：从头两两比较，大的往后「冒」，每轮把当前最大值送到末尾，n 轮后有序。**插入排序**一句带过：像整理手牌，把新牌插进左边已有序的部分——数据量小或基本有序时意外地快，也是内置排序的组成部分。

**归并排序**——分治的代表：不断对半砍，砍到只剩一个元素（天然有序），再把两个有序小片**合并**成更大的有序片：

```
[5 3 8 1]                拆：每次对半
[5 3]    [8 1]
[5][3]   [8][1]          剩 1 个 → 天然有序
[3 5]    [1 8]           合并：两个指针各扫一片，谁小取谁
[1 3 5 8]
```

拆 log n 层 × 每层扫 n 个 = **O(n log n)**；合并时相等元素先取原左边的，保证**稳定**（相等不换位）。

**快速排序**——另一个分治流派：选基准，把小的甩左边、大的甩右边（分区），再对两半各来一遍。平均 O(n log n)、常数小、可原地；最坏情况（基准总选得极偏，如已有序数据取首元素）退化 O(n²)。

| 算法 | 平均 | 最坏 | 稳定 | 一句话 |
|---|---|---|---|---|
| 冒泡 | O(n²) | O(n²) | 稳定 | 教学用，实战慢 |
| 插入 | O(n²) | O(n²) | 稳定 | 小数据 / 近有序快 |
| 归并 | O(n log n) | O(n log n) | 稳定 | 要额外空间 |
| 快排 | O(n log n) | O(n²) | 不稳定 | 原地、常数小 |
| Timsort | O(n log n) | O(n log n) | 稳定 | Python 内置 |

**Python 的 `sorted()` / `list.sort()` 用 Timsort**——归并 + 插入的混合体：趁真实数据常「局部有序」，找出现成的有序片段再缝合。结论：**日常一律用内置排序，手写是为了理解和面试**。

## 代码示例

```python
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):                 # n-1 轮
        swapped = False
        for j in range(n - 1 - i):         # 每轮两两比较
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]   # 大的往后冒
                swapped = True
        if not swapped:                    # 一轮没换过 → 已有序，提前收工
            break
    return a
def merge_sort(a):
    if len(a) <= 1:                        # 基线：单片天然有序
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])   # 分
    out, i, j = [], 0, 0                   # 治：合并两个有序片
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:            # 相等取左边 → 稳定
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]      # 接上剩余部分
def quick_sort(a):                         # 简化版（新建列表）；标准实现是原地分区
    if len(a) <= 1:
        return a
    pivot = a[len(a) // 2]                 # 中间元素当基准
    small = [x for x in a if x < pivot]
    mid   = [x for x in a if x == pivot]
    big   = [x for x in a if x > pivot]
    return quick_sort(small) + mid + quick_sort(big)
print(bubble_sort([5, 3, 8, 1]))           # [1, 3, 5, 8]
print(merge_sort([5, 3, 8, 1]))            # [1, 3, 5, 8]
print(quick_sort([5, 3, 8, 1]))            # [1, 3, 5, 8]
```

## 常见坑

1. **坑 1：面试用「新列表版」冒充原地快排**。简化版空间 O(n)，丢了快排「原地、常数小」的核心优势。排查：说清自己写的是哪种。
2. **坑 2：已有序数据还取首元素当基准**。分区两半极端失衡，退化 O(n²)。排查：随机选基准，或取中间 / 三数取中。
3. **坑 3：`lst = lst.sort()`**。`sort()` 原地修改且返回 `None`，赋值后列表变成 `None`。排查：要新列表用 `sorted(lst)`。

## 小练习

1. 在 VisuAlgo 用同一组数据对比归并与快排的分区过程，说出两者最大的差异。
2. 把 merge_sort 里的 `left[i] <= right[j]` 改成 `<`，用含重复元素的输入验证稳定性被破坏。
3. 思考题：为什么真实数据上 Timsort 常接近 O(n)？（提示：找现成的有序片段。）
